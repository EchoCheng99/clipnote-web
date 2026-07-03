import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { expressions } = await req.json();
  if (!Array.isArray(expressions) || expressions.length === 0) {
    return NextResponse.json({ error: "请至少选择一个表达" }, { status: 400 });
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("deepseek_api_key, model_preference")
    .eq("user_id", user.id)
    .maybeSingle();

  const apiKey = settings?.deepseek_api_key;
  const model = settings?.model_preference || "deepseek-v4-flash";
  if (!apiKey) {
    return NextResponse.json(
      { error: "还没配置 DeepSeek API Key，请先去设置页填写" },
      { status: 400 }
    );
  }

  const listStr = expressions.map((e: any) => `${e.en}(${e.zh})`).join("、");

  try {
    const resp = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        max_tokens: 1000,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              '你是英语学习场景设计师。给定一组英文表达及其中文释义，请设计一段100-160字的中文场景短文（日常情境、新闻场景或工作场景均可），使得读者在把这段中文翻译成英文时，自然会需要用到这些表达对应的含义。不要直接出现英文表达本身，只用中文描述场景和情节。只返回严格的JSON，不要任何前后缀说明，不要markdown代码块标记，格式为: {"scenario": "中文场景文本"}'
          },
          { role: "user", content: `表达清单: ${listStr}` }
        ]
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return NextResponse.json(
        { error: `DeepSeek API错误 (HTTP ${resp.status}): ${errText.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content || "";
    const clean = extractJson(text);
    const parsed = JSON.parse(clean);
    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "生成失败" }, { status: 500 });
  }
}

function extractJson(text: string) {
  let clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const first = clean.indexOf("{");
  const last = clean.lastIndexOf("}");
  if (first >= 0 && last > first) clean = clean.slice(first, last + 1);
  return clean;
}
