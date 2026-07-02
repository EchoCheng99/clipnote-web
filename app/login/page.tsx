"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo("注册成功！如果开启了邮箱验证，请去邮箱点击确认链接后再登录。");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/library");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "出错了，请重试");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm clip-card p-8">
        <p className="font-serif text-2xl font-bold mb-1">剪报本</p>
        <p className="font-voice italic text-teal text-sm mb-6">
          from intake to output
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-inksoft font-medium block mb-1">邮箱</label>
            <input
              type="email"
              required
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-xs text-inksoft font-medium block mb-1">密码</label>
            <input
              type="password"
              required
              minLength={6}
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少6位"
            />
          </div>

          {error && <p className="text-sm text-redpen">{error}</p>}
          {info && <p className="text-sm text-teal">{info}</p>}

          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? "处理中…" : mode === "login" ? "登录" : "注册"}
          </button>
        </form>

        <button
          className="text-xs text-inkfaint mt-4 underline"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError("");
            setInfo("");
          }}
        >
          {mode === "login" ? "还没有账号？去注册" : "已经有账号？去登录"}
        </button>
      </div>
    </div>
  );
}
