import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Item = { str: string; x: number; y: number };

function reconstructPageText(items: Item[], pageWidth: number): string {
  if (items.length === 0) return "";

  const mid = pageWidth / 2;
  const leftCount = items.filter((it) => it.x < mid - pageWidth * 0.05).length;
  const rightCount = items.filter((it) => it.x > mid + pageWidth * 0.05).length;
  const isTwoColumn = leftCount > items.length * 0.15 && rightCount > items.length * 0.15;

  function linesFromItems(list: Item[]): string {
    if (list.length === 0) return "";
    const sorted = [...list].sort((a, b) => b.y - a.y || a.x - b.x);
    const lines: Item[][] = [];
    let currentLine: Item[] = [sorted[0]];
    const Y_TOLERANCE = 3;
    for (let i = 1; i < sorted.length; i++) {
      const prevY = currentLine[currentLine.length - 1].y;
      if (Math.abs(sorted[i].y - prevY) <= Y_TOLERANCE) {
        currentLine.push(sorted[i]);
      } else {
        lines.push(currentLine);
        currentLine = [sorted[i]];
      }
    }
    lines.push(currentLine);
    return lines
      .map((line) =>
        line
          .sort((a, b) => a.x - b.x)
          .map((it) => it.str)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim()
      )
      .filter(Boolean)
      .join("\n");
  }

  if (!isTwoColumn) {
    return linesFromItems(items);
  }

  const leftItems = items.filter((it) => it.x < mid);
  const rightItems = items.filter((it) => it.x >= mid);
  return linesFromItems(leftItems) + "\n\n" + linesFromItems(rightItems);
}

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "没有收到文件" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const pdfParse = (await import("pdf-parse")).default;

    // 用 pagerender 钩子接管每一页的文字提取，
    // 拿到每个文字片段的坐标，按"先左栏后右栏"重新拼版
    const data = await pdfParse(buffer, {
      pagerender: async (pageData: any) => {
        const viewport = pageData.getViewport({ scale: 1 });
        const textContent = await pageData.getTextContent();
        const items: Item[] = (textContent.items as any[])
          .filter((it) => it.str && it.str.trim())
          .map((it) => ({
            str: it.str,
            x: it.transform[4],
            y: it.transform[5]
          }));
        return reconstructPageText(items, viewport.width);
      }
    });

    const text = (data.text || "").replace(/\n{3,}/g, "\n\n").trim();
    if (!text) {
      return NextResponse.json(
        { error: "没有从这个PDF里提取到文字，可能是扫描版图片PDF，暂不支持" },
        { status: 422 }
      );
    }

    const title = file.name.replace(/\.pdf$/i, "");

    const { data: inserted, error } = await supabase
      .from("articles")
      .insert({ user_id: user.id, title, content: text })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "保存失败: " + error.message }, { status: 500 });
    }

    return NextResponse.json(inserted);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "解析失败" }, { status: 500 });
  }
}
