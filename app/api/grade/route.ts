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

  const { scenarioZh, userEn, expressions } = await req.json();
  if (!scenarioZh || !userEn) {
    return NextResponse.json({ error: "缺少场景或译文" }, { status: 400 });
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("deepseek_api_key")
    .eq("user_id", user.id)
    .maybeSingle();

  const apiKey = settings?.deepseek_api_key;
  if (!apiKey) {
    return NextResponse.json(
      { error: "还没配置 DeepSeek API Key，请先去设置页填写" },
      { status: 400 }
    );
  }

  const exprListStr = (expressions || []).map((e: any) => `${e.en}(${e.zh})`).join("、");

  const sys =
    '你是一位严格但鼓励学生的英语写作老师，批改中译英练习。给定中文场景、学生的英文翻译、以及本次要考察的目标表达清单，请仔细批改。只返回严格JSON，不要markdown代码块标记，不要任何多余文字，格式为：{"overall_score": 0-100整数, "grammar_score": 0-100整数, "expression_score": 0-100整数, "coverage_score": 0-100整数, "corrected_text": "修改后的地道英文版本", "annotations": [{"original": "学生原句中有问题的片段（英文，不超过12词）", "issue": "问题简述（中文，不超过20字）", "suggestion": "建议改法（英文）"}], "expression_usage": [{"expression": "英文表达", "used": true或false, "note": "简短说明（中文，不超过15字）"}], "summary": "总体点评，中文，40-70字，语气鼓励但诚实"}';

  const user_prompt = `中文场景: ${scenarioZh}\n\n目标表达清单: ${exprListStr}\n\n学生英文翻译: ${userEn}`;

  try {
    const resp = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
	max_tokens: 3000,
	response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user_prompt }
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
    return NextResponse.json({ error: err.message || "批改失败" }, { status: 500 });
  }
}

function extractJson(text: string) {
  let clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const first = clean.indexOf("{");
  const last = clean.lastIndexOf("}");
  if (first >= 0 && last > first) clean = clean.slice(first, last + 1);
  return clean;
}
