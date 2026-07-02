"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/client";

type Expr = { id: string; en: string; zh: string; status: string; review_count: number };
type Feedback = {
  overall_score: number;
  grammar_score: number;
  expression_score: number;
  coverage_score: number;
  corrected_text: string;
  annotations: { original: string; issue: string; suggestion: string }[];
  expression_usage: { expression: string; used: boolean; note: string }[];
  summary: string;
};

export default function PracticePage() {
  const supabase = createClient();
  const [items, setItems] = useState<Expr[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [scenario, setScenario] = useState("");
  const [userEn, setUserEn] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [genError, setGenError] = useState("");
  const [gradeError, setGradeError] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [gradeLoading, setGradeLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("expressions")
      .select("id, en, zh, status, review_count")
      .order("added_at", { ascending: false })
      .then(({ data }) => data && setItems(data as Expr[]));
  }, []);

  function togglePick(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }
  function pickRandom() {
    const pool = [...items.map((e) => e.id)].sort(() => Math.random() - 0.5);
    setPicked(pool.slice(0, 5));
  }
  function pickReview() {
    const rank: any = { new: 0, familiar: 1, mastered: 2 };
    const sorted = [...items].sort((a, b) => rank[a.status] - rank[b.status]);
    setPicked(sorted.slice(0, 5).map((e) => e.id));
  }

  async function generateScenario() {
    setGenError("");
    setScenario("");
    setFeedback(null);
    if (picked.length === 0) {
      setGenError("先选至少一个表达");
      return;
    }
    setGenLoading(true);
    const pickedExprs = items.filter((e) => picked.includes(e.id));
    try {
      const res = await fetch("/api/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expressions: pickedExprs })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      setScenario(data.scenario);
    } catch (err: any) {
      setGenError(err.message);
    }
    setGenLoading(false);
  }

  async function submitWriting() {
    setGradeError("");
    if (!userEn.trim()) {
      setGradeError("先写点什么吧");
      return;
    }
    setGradeLoading(true);
    const pickedExprs = items.filter((e) => picked.includes(e.id));
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioZh: scenario, userEn, expressions: pickedExprs })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "批改失败");
      setFeedback(data);

      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("sessions").insert({
          user_id: user.id,
          expr_ids: picked,
          scenario_zh: scenario,
          user_en: userEn,
          feedback: data,
          score: data.overall_score
        });
        for (const u of data.expression_usage || []) {
          const ex = pickedExprs.find((e) => e.en === u.expression);
          if (!ex) continue;
          let newStatus = ex.status;
          let newCount = ex.review_count;
          if (u.used) {
            newCount += 1;
            if (ex.status === "new") newStatus = "familiar";
            else if (ex.status === "familiar" && newCount >= 2) newStatus = "mastered";
          } else {
            newStatus = "new";
          }
          await supabase
            .from("expressions")
            .update({ status: newStatus, review_count: newCount, last_reviewed: new Date().toISOString() })
            .eq("id", ex.id);
        }
      }
    } catch (err: any) {
      setGradeError(err.message);
    }
    setGradeLoading(false);
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <Nav />

      <div className="clip-card p-5 mb-6">
        <p className="section-label mb-3">第一步 · 选择本次要用的表达</p>
        <div className="flex gap-2 mb-4">
          <button className="btn-outline" onClick={pickReview}>
            优先选待复习
          </button>
          <button className="btn-outline" onClick={pickRandom}>
            随机抽 5 个
          </button>
          <button className="btn-outline" onClick={() => setPicked([])}>
            清空选择
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {items.length === 0 && (
            <p className="font-voice italic text-inkfaint text-sm">
              先去"表达库"贴几条剪报吧。
            </p>
          )}
          {items.map((ex) => (
            <span
              key={ex.id}
              onClick={() => togglePick(ex.id)}
              className={
                "font-voice text-sm px-3 py-1.5 rounded-full border cursor-pointer " +
                (picked.includes(ex.id)
                  ? "bg-highlightsoft border-highlight font-semibold"
                  : "bg-white border-linestrong text-inksoft")
              }
            >
              {ex.en}
            </span>
          ))}
        </div>
        <button className="btn-primary bg-teal border-teal" onClick={generateScenario} disabled={genLoading}>
          {genLoading ? "生成中…" : "生成中文场景"}
        </button>
        {genError && <p className="text-sm text-redpen mt-2">{genError}</p>}
      </div>

      {scenario && (
        <div className="clip-card p-5 mb-6">
          <p className="section-label mb-3">第二步 · 场景</p>
          <div className="bg-card2 border border-linestrong rounded p-5 font-serif leading-8 mb-5">
            <span className="section-label block mb-2 text-teal">SCENARIO</span>
            {scenario}
          </div>
          <p className="section-label mb-3">第三步 · 把它翻译 / 写成英文</p>
          <textarea
            className="field-input font-voice min-h-[120px] mb-4"
            value={userEn}
            onChange={(e) => setUserEn(e.target.value)}
            placeholder="Write your English version here..."
          />
          <button className="btn-primary" onClick={submitWriting} disabled={gradeLoading}>
            {gradeLoading ? "批改中…" : "提交批改"}
          </button>
          {gradeError && <p className="text-sm text-redpen mt-2">{gradeError}</p>}
        </div>
      )}

      {feedback && (
        <div className="clip-card p-5">
          <p className="section-label mb-3">批改结果</p>
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              ["总分", feedback.overall_score],
              ["语法", feedback.grammar_score],
              ["表达地道度", feedback.expression_score],
              ["目标覆盖", feedback.coverage_score]
            ].map(([label, val]) => (
              <div key={label as string} className="bg-card2 rounded text-center py-2">
                <div className="font-mono text-2xl font-semibold">{val}</div>
                <div className="text-[11px] text-inkfaint mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {feedback.annotations?.length > 0 && (
            <>
              <p className="section-label mb-2 mt-4">红笔批注</p>
              {feedback.annotations.map((a, i) => (
                <div key={i} className="flex gap-3 py-2 border-t border-dashed border-linestrong first:border-t-0">
                  <div className="font-voice italic text-redpen text-sm w-1/3 flex-shrink-0">
                    "{a.original}"
                  </div>
                  <div className="text-sm">
                    <b className="text-redpen font-semibold">{a.issue}</b> → {a.suggestion}
                  </div>
                </div>
              ))}
            </>
          )}

          {feedback.expression_usage?.length > 0 && (
            <>
              <p className="section-label mb-2 mt-4">目标表达使用情况</p>
              {feedback.expression_usage.map((u, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5 text-sm">
                  <span
                    className={
                      "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 " +
                      (u.used ? "bg-teal" : "bg-redpen")
                    }
                  >
                    {u.used ? "✓" : "✕"}
                  </span>
                  <span className="font-medium">{u.expression}</span>
                  <span className="text-inkfaint">— {u.note}</span>
                </div>
              ))}
            </>
          )}

          <p className="section-label mb-2 mt-4">参考地道版本</p>
          <div className="font-voice text-sm leading-7 bg-tealsoft rounded p-4 mb-4">
            {feedback.corrected_text}
          </div>

          <p className="section-label mb-2">点评</p>
          <p className="text-sm leading-7">{feedback.summary}</p>
        </div>
      )}
    </div>
  );
}
