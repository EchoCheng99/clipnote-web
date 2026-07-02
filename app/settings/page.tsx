"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const supabase = createClient();
  const [key, setKey] = useState("");
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
        .select("deepseek_api_key")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.deepseek_api_key) {
        setKey(data.deepseek_api_key);
        setSaved(true);
      }
      setLoading(false);
    })();
  }, []);

  async function saveKey() {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("user_settings")
      .upsert({ user_id: user.id, deepseek_api_key: key.trim() }, { onConflict: "user_id" });
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
          生成场景和批改功能需要你自己的 DeepSeek API Key。去{" "}
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
              className="field-input mb-3"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-..."
            />
            <div className="flex items-center gap-3">
              <button className="btn-primary" onClick={saveKey}>
                保存
              </button>
              <span className="text-xs text-teal">{hint}</span>
            </div>
            {saved && !hint && (
              <p className="text-xs text-inkfaint mt-3">已配置 Key，练习功能可以正常使用。</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
