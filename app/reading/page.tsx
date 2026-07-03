"use client";

import { useEffect, useRef, useState } from "react";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/client";

type Article = { id: string; title: string; content: string; created_at: string };
type Collocation = {
  en: string;
  zh: string;
  example: string;
  translation: string;
  synonym: string;
};
type Analysis = { grammar_explanation: string; collocations: Collocation[] };

export default function ReadingPage() {
  const supabase = createClient();
  const contentRef = useRef<HTMLDivElement>(null);

  const [articles, setArticles] = useState<Article[]>([]);
  const [current, setCurrent] = useState<Article | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [selection, setSelection] = useState("");
  const [buttonPos, setButtonPos] = useState<{ top: number; left: number } | null>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [addedFlags, setAddedFlags] = useState<Record<number, boolean>>({});

  async function loadArticles() {
    const { data } = await supabase
      .from("articles")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setArticles(data as Article[]);
  }

  useEffect(() => {
    loadArticles();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/extract-pdf", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "上传失败");
      setArticles((prev) => [data, ...prev]);
      setCurrent(data);
    } catch (err: any) {
      setUploadError(err.message);
    }
    setUploading(false);
    e.target.value = "";
  }

  function closePopup() {
    setSelection("");
    setButtonPos(null);
    setPanelPos(null);
    setAnalysis(null);
    setAnalyzeError("");
  }

  function handleMouseUp() {
    const sel = window.getSelection();
    const text = sel?.toString().trim() || "";
    if (!text || !contentRef.current) {
      return;
    }
    const anchorNode = sel?.anchorNode;
    if (!anchorNode || !contentRef.current.contains(anchorNode)) {
      return;
    }
    const range = sel!.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = contentRef.current.getBoundingClientRect();

    setSelection(text);
    setButtonPos({
      top: rect.top - containerRect.top - 40,
      left: Math.max(0, rect.left - containerRect.left)
    });
    // 面板宽度约 380px，靠左对齐但不超出容器右边界
    const panelWidth = 380;
    const maxLeft = Math.max(0, containerRect.width - panelWidth);
    setPanelPos({
      top: rect.bottom - containerRect.top + 10,
      left: Math.min(Math.max(0, rect.left - containerRect.left), maxLeft)
    });
    setAnalysis(null);
    setAnalyzeError("");
  }

  async function analyzeSelection() {
    if (!selection) return;
    setAnalyzing(true);
    setAnalyzeError("");
    setAnalysis(null);
    setAddedFlags({});
    try {
      const res = await fetch("/api/analyze-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedText: selection, context: current?.content })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "解析失败");
      setAnalysis(data);
    } catch (err: any) {
      setAnalyzeError(err.message);
    }
    setAnalyzing(false);
  }

  async function addToLibrary(c: Collocation, idx: number) {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("expressions").insert({
      user_id: user.id,
      en: c.en,
      zh: c.zh,
      example: c.example,
      tag: current?.title || "精读文章",
      status: "new",
      review_count: 0
    });
    if (!error) {
      setAddedFlags((f) => ({ ...f, [idx]: true }));
    }
  }

  const showFloatingPanel = analyzing || analysis || analyzeError;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Nav />

      {!current ? (
        <div className="clip-card p-5">
          <p className="section-label mb-3">导入外刊PDF</p>
          <label className="btn-primary inline-block cursor-pointer">
            {uploading ? "解析中…" : "选择PDF文件"}
            <input type="file" accept="application/pdf" hidden onChange={handleUpload} disabled={uploading} />
          </label>
          {uploadError && <p className="text-sm text-redpen mt-2">{uploadError}</p>}

          <p className="section-label mt-8 mb-3">我的文章</p>
          {articles.length === 0 ? (
            <p className="font-voice italic text-inkfaint text-sm">还没有导入过文章。</p>
          ) : (
            <div className="space-y-2">
              {articles.map((a) => (
                <div
                  key={a.id}
                  onClick={() => setCurrent(a)}
                  className="cursor-pointer border border-linestrong rounded p-3 hover:bg-card2"
                >
                  <p className="font-serif font-semibold">{a.title}</p>
                  <p className="text-xs text-inkfaint mt-1">
                    {new Date(a.created_at).toLocaleDateString("zh-CN")} ·{" "}
                    {a.content.slice(0, 40)}…
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <button
              className="text-sm text-inkfaint underline"
              onClick={() => {
                setCurrent(null);
                closePopup();
              }}
            >
              ← 返回文章列表
            </button>
            <p className="font-serif font-semibold">{current.title}</p>
          </div>

          <p className="text-xs text-inkfaint mb-3">
            用鼠标选中任意一段文字（可跨句），会出现"AI解析"按钮，解析结果会悬浮显示在选中内容正下方
          </p>

          <div className="clip-card p-6 relative">
            <div
              ref={contentRef}
              onMouseUp={handleMouseUp}
              className="font-voice text-[15px] leading-8 whitespace-pre-wrap select-text"
            >
              {current.content}
            </div>

            {selection && buttonPos && !showFloatingPanel && (
              <button
                style={{ position: "absolute", top: buttonPos.top, left: buttonPos.left }}
                className="bg-ink text-card text-xs font-semibold px-3 py-1.5 rounded shadow-lg z-20"
                onClick={analyzeSelection}
              >
                AI 解析
              </button>
            )}

            {showFloatingPanel && panelPos && (
              <div
                style={{
                  position: "absolute",
                  top: panelPos.top,
                  left: panelPos.left,
                  width: 380
                }}
                className="bg-card border border-linestrong rounded-lg shadow-2xl z-30 max-h-[420px] overflow-y-auto"
              >
                <div className="flex justify-between items-center px-4 py-2 border-b border-line sticky top-0 bg-card">
                  <span className="section-label">AI 解析</span>
                  <button
                    onClick={closePopup}
                    className="text-inkfaint hover:text-redpen text-sm leading-none"
                    aria-label="关闭"
                  >
                    ×
                  </button>
                </div>

                <div className="p-4">
                  {analyzing && (
                    <p className="text-sm text-inkfaint">解析中…</p>
                  )}
                  {analyzeError && <p className="text-sm text-redpen">{analyzeError}</p>}

                  {analysis && (
                    <>
                      <p className="text-sm leading-6 mb-4">{analysis.grammar_explanation}</p>

                      {analysis.collocations?.length > 0 && (
                        <>
                          <p className="section-label mb-2">🔖 搭配积累</p>
                          <div className="space-y-3">
                            {analysis.collocations.map((c, idx) => (
                              <div key={idx} className="border-t border-line pt-2 first:border-t-0 first:pt-0">
                                <div className="flex justify-between items-start gap-2">
                                  <div>
                                    <p className="font-voice font-semibold text-sm">{c.en}</p>
                                    <p className="text-xs text-inksoft mt-0.5">{c.zh}</p>
                                    <p className="font-voice text-xs text-inkfaint mt-1.5 italic">
                                      "{c.example}"
                                    </p>
                                    <p className="text-xs text-inkfaint">{c.translation}</p>
                                    {c.synonym && (
                                      <p className="text-xs text-teal mt-1">近义: {c.synonym}</p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => addToLibrary(c, idx)}
                                    disabled={!!addedFlags[idx]}
                                    className={
                                      "text-[11px] font-semibold px-2 py-1 rounded-full flex-shrink-0 whitespace-nowrap " +
                                      (addedFlags[idx]
                                        ? "bg-tealsoft text-teal"
                                        : "bg-highlightsoft border border-highlight")
                                    }
                                  >
                                    {addedFlags[idx] ? "✓" : "+加入"}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
