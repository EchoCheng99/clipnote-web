"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const supabase = createClient();
  const [key, setKey] = useState("");
  const [model, setModel] = useState("deepseek-v4-flash");
  const [saved, setSaved] = useState(false);
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("user_settings")
        .select("deepseek_api_key, model_preference")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.deepseek_api_key) {
        setKey(data.deepseek_api_key);
        setSaved(true);
      }
      if (data?.model_preference) {
        setModel(data.model_preference);
      }
      setLoading(false);
    })();
  }, []);

  async function saveSettings() {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("user_settings")
      .upsert(
        { user_id: user.id, deepseek_api_key: key.trim(), model_preference: model },
        { onConflict: "user_id" }
      );
    if (error) {
      setHint("保存失败: " + error.message);
      return;
    }
    setSaved(true);
    setHint("已保存 ✓");
    setTimeout(() => setHint(""), 1500);
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <Nav />
      <div className="clip-card p-6">
        <p className="section-label mb-3">DeepSeek API Key</p>
        <p className="text-sm text-inksoft mb-4 leading-relaxed">
          生成场景、批改、精读解析这些功能需要你自己的 DeepSeek API Key。去{" "}
          <a
            href="https://platform.deepseek.com"
            target="_blank"
            className="text-teal underline"
          >
            platform.deepseek.com
          </a>{" "}
          申请，粘贴到下面。Key 只存在你自己账号名下，其他人看不到，调用产生的费用算在你自己的
          DeepSeek 账户里。
        </p>
        {loading ? (
          <p className="text-sm text-inkfaint">加载中…</p>
        ) : (
          <>
            <input
              type="password"
              className="field-input mb-6"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-..."
            />

            <p className="section-label mb-3">使用的模型</p>
            <p className="text-sm text-inksoft mb-4 leading-relaxed">
              Flash 更快更省钱，日常练习完全够用；Pro 推理和语感判断更强，费用更高，适合想要更精准地道的批改结果时使用。
            </p>
            <div className="flex gap-3 mb-6">
              <label
                className={
                  "flex-1 border rounded-lg p-4 cursor-pointer " +
                  (model === "deepseek-v4-flash"
                    ? "border-highlight bg-highlightsoft"
                    : "border-linestrong bg-white")
                }
              >
                <input
                  type="radio"
                  name="model"
                  className="hidden"
                  checked={model === "deepseek-v4-flash"}
                  onChange={() => setModel("deepseek-v4-flash")}
                />
                <p className="font-serif font-semibold text-sm">DeepSeek V4 Flash</p>
                <p className="text-xs text-inkfaint mt-1">快 · 省钱 · 日常练习首选</p>
              </label>
              <label
                className={
                  "flex-1 border rounded-lg p-4 cursor-pointer " +
                  (model === "deepseek-v4-pro"
                    ? "border-highlight bg-highlightsoft"
                    : "border-linestrong bg-white")
                }
              >
                <input
                  type="radio"
                  name="model"
                  className="hidden"
                  checked={model === "deepseek-v4-pro"}
                  onChange={() => setModel("deepseek-v4-pro")}
                />
                <p className="font-serif font-semibold text-sm">DeepSeek V4 Pro</p>
                <p className="text-xs text-inkfaint mt-1">更精准地道 · 费用更高</p>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button className="btn-primary" onClick={saveSettings}>
                保存
              </button>
              <span className="text-xs text-teal">{hint}</span>
            </div>
            {saved && !hint && (
              <p className="text-xs text-inkfaint mt-3">已配置，练习功能可以正常使用。</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
