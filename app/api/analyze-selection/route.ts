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

  const { selectedText, context } = await req.json();
  if (!selectedText || !selectedText.trim()) {
    return NextResponse.json({ error: "没有选中文字" }, { status: 400 });
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

  const sys = `你是英语精读老师。给定一段学生选中的英文原文（以及它所在段落的上下文），请做两件事：
1. 用中文简要解析这段文字的语法结构（句子成分、从句、时态、固定结构等），控制在120字以内。
2. 从这段选中文字里，挑出1-3个值得学习者积累的高频表达/短语/句型（不要挑太基础的单词），每个给出：英文原形、中文释义、这个表达在原文中所在的那一整句话（必须是原文逐字摘录，不要自己改写或新造句子，标点和大小写都照抄原文）、这句原文的中文翻译、1个近义表达（没有则留空字符串）。

严格要求：
- 只返回严格合法的JSON，不要markdown代码块标记，不要任何多余文字
- 如果摘录的原句本身包含双引号字符，必须在JSON字符串里用反斜杠转义（写成 \\" ），否则JSON会解析失败
- 每个字段内容尽量简洁，不要过长

返回格式为：
{"grammar_explanation": "中文语法解析", "collocations": [{"en": "表达", "zh": "中文释义", "example": "原文中包含该表达的完整原句（逐字摘录，注意转义内部引号）", "translation": "该原句的中文翻译", "synonym": "近义表达或空字符串"}]}`;

  const userPrompt = `段落上下文: ${context || selectedText}\n\n学生选中的部分: ${selectedText}`;

  try {
    const resp = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        max_tokens: 2500,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userPrompt }
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
    let clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const first = clean.indexOf("{");
    const last = clean.lastIndexOf("}");
    if (first >= 0 && last > first) clean = clean.slice(first, last + 1);
    const parsed = JSON.parse(clean);
    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "解析失败" }, { status: 500 });
  }
}
