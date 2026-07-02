"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/client";

type Expr = {
  id: string;
  en: string;
  zh: string;
  example: string | null;
  tag: string | null;
  status: string;
  review_count: number;
};

export default function LibraryPage() {
  const supabase = createClient();
  const [items, setItems] = useState<Expr[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ en: "", zh: "", example: "", tag: "" });
  const [hint, setHint] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("expressions")
      .select("*")
      .order("added_at", { ascending: false });
    if (!error && data) setItems(data as Expr[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addExpr() {
    if (!form.en.trim() || !form.zh.trim()) {
      setHint("英文表达和中文释义不能为空");
      return;
    }
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("expressions").insert({
      user_id: user.id,
      en: form.en.trim(),
      zh: form.zh.trim(),
      example: form.example.trim() || null,
      tag: form.tag.trim() || "未分类",
      status: "new",
      review_count: 0
    });
    if (error) {
      setHint("保存失败: " + error.message);
      return;
    }
    setForm({ en: "", zh: "", example: "", tag: "" });
    setHint("已贴入 ✓");
    setTimeout(() => setHint(""), 1500);
    load();
  }

  async function deleteExpr(id: string) {
    await supabase.from("expressions").delete().eq("id", id);
    load();
  }

  const statusLabel = (s: string) =>
    s === "mastered" ? "已掌握" : s === "familiar" ? "熟悉" : "待巩固";
  const dotColor = (s: string) =>
    s === "mastered" ? "bg-teal" : s === "familiar" ? "bg-highlight" : "bg-redpen";

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <Nav />

      <div className="clip-card p-5 mb-6">
        <p className="section-label mb-3">贴入新剪报</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-inksoft font-medium block mb-1">英文表达</label>
            <input
              className="field-input"
              value={form.en}
              onChange={(e) => setForm({ ...form, en: e.target.value })}
              placeholder="e.g. a far cry from"
            />
          </div>
          <div>
            <label className="text-xs text-inksoft font-medium block mb-1">中文释义</label>
            <input
              className="field-input"
              value={form.zh}
              onChange={(e) => setForm({ ...form, zh: e.target.value })}
              placeholder="与……相去甚远"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-inksoft font-medium block mb-1">原文例句(选填)</label>
            <textarea
              className="field-input"
              value={form.example}
              onChange={(e) => setForm({ ...form, example: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-inksoft font-medium block mb-1">标签(选填)</label>
            <input
              className="field-input"
              value={form.tag}
              onChange={(e) => setForm({ ...form, tag: e.target.value })}
              placeholder="如：商业 · The Economist"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={addExpr}>
            贴入剪报本
          </button>
          <span className="text-xs text-inkfaint">{hint}</span>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-inkfaint">加载中…</p>
      ) : items.length === 0 ? (
        <p className="font-voice italic text-inkfaint">
          还没有剪报——把今天精读文章里的表达贴进来吧。
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((ex) => (
            <div key={ex.id} className="clip-card p-4 relative">
              <button
                onClick={() => deleteExpr(ex.id)}
                className="absolute top-2 right-2 text-inkfaint hover:text-redpen"
                aria-label="删除"
              >
                ×
              </button>
              <div className="font-voice text-lg font-semibold">{ex.en}</div>
              <div className="text-sm text-inksoft mt-1 mb-2">{ex.zh}</div>
              {ex.example && (
                <p className="font-voice italic text-xs text-inkfaint border-l-2 border-linestrong pl-2 mb-3">
                  {ex.example}
                </p>
              )}
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10.5px] bg-tealsoft text-teal px-2 py-0.5 rounded-full">
                  {ex.tag}
                </span>
                <span className="font-mono text-[10.5px] text-inkfaint flex items-center gap-1">
                  <span className={"w-1.5 h-1.5 rounded-full " + dotColor(ex.status)} />
                  {statusLabel(ex.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
