"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/client";

type Session = {
  id: string;
  date: string;
  scenario_zh: string;
  user_en: string;
  score: number;
  feedback: any;
};

export default function HistoryPage() {
  const supabase = createClient();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("sessions")
      .select("*")
      .order("date", { ascending: false })
      .then(({ data }) => {
        if (data) setSessions(data as Session[]);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <Nav />
      <div className="clip-card p-5">
        <p className="section-label mb-3">练习记录 · 共 {sessions.length} 次</p>
        {loading ? (
          <p className="text-sm text-inkfaint">加载中…</p>
        ) : sessions.length === 0 ? (
          <p className="font-voice italic text-inkfaint">
            还没有练习记录，去"练习"标签开始第一次输出吧。
          </p>
        ) : (
          sessions.map((s) => (
            <div key={s.id} className="border-b border-line last:border-b-0 py-3">
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => setOpen(open === s.id ? null : s.id)}
              >
                <span className="font-mono text-xs text-inkfaint">
                  {new Date(s.date).toLocaleString("zh-CN")}
                </span>
                <span className="font-mono font-semibold text-teal">{s.score} 分</span>
              </div>
              <p className="font-serif text-sm text-inksoft mt-1 truncate">{s.scenario_zh}</p>
              {open === s.id && (
                <div className="mt-3 text-sm space-y-3">
                  <div>
                    <p className="section-label mb-1">你的译文</p>
                    <p className="font-voice">{s.user_en}</p>
                  </div>
                  <div>
                    <p className="section-label mb-1">点评</p>
                    <p>{s.feedback?.summary}</p>
                  </div>
                  <div>
                    <p className="section-label mb-1">参考版本</p>
                    <p className="font-voice bg-tealsoft rounded p-3">
                      {s.feedback?.corrected_text}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
