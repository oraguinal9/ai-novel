"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { WORLDS, type WorldConfig, type CharacterPreset } from "@/game/worlds";
import {
  type GameState, type StorySegment, type ChoiceOption,
  buildPrompt, applyEffects, createInitialState, checkGameOver,
} from "@/game/engine";

function PlayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const worldId = searchParams.get("world")!;
  const charName = searchParams.get("character")!;
  const token = searchParams.get("token");
  const shouldLoad = searchParams.get("load") === "true";

  const world = WORLDS.find(w => w.id === worldId);
  const charPreset = world?.characters.find(c => c.name === charName);

  const [state, setState] = useState<GameState | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [choices, setChoices] = useState<ChoiceOption[]>([]);
  const [error, setError] = useState("");
  const [gameOverMsg, setGameOverMsg] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [transition, setTransition] = useState<{ show: boolean; chapter: number }>({ show: false, chapter: 0 });
  const [prevStates, setPrevStates] = useState<GameState[]>([]); // for undo
  const scrollRef = useRef<HTMLDivElement>(null);
  const choicesRef = useRef<HTMLDivElement>(null);

  // Init
  useEffect(() => {
    if (!world || !charPreset) { router.push("/"); return; }
    if (state) return;

    if (shouldLoad && token) {
      fetch("/api/save?token=" + token)
        .then(r => r.json())
        .then(data => {
          if (data.world_id) {
            const loaded: GameState = {
              worldId: data.world_id,
              character: data.character,
              stats: data.stats,
              chapter: data.chapter,
              history: data.history || [],
              summary: data.summary || "",
            };
            setState(loaded);
            const last = loaded.history[loaded.history.length - 1];
            if (last) {
              setStreamText(last.text);
              setChoices(last.choices);
            }
          } else { startFresh(); }
        })
        .catch(() => startFresh());
    } else {
      startFresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startFresh = () => {
    if (!charPreset) return;
    const s = createInitialState(worldId, charPreset);
    setState(s);
    generate(s, world!, charPreset);
  };

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [streamText, choices]);

  // ===== AI Generation =====
  const generate = async (currentState: GameState, w: WorldConfig, cp: CharacterPreset) => {
    setStreaming(true);
    setStreamText("");
    setChoices([]);
    setError("");

    const prompt = buildPrompt(currentState, w, cp);

    // Show loading after 3s of no data
    const loadingTimer = setTimeout(() => {
      setStreamText(prev => prev || "AI 正在构思剧情...");
    }, 3000);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000); // 45s timeout

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      clearTimeout(loadingTimer);

      if (!res.ok) {
        const errBody = await res.text();
        let errMsg = "生成失败";
        try { errMsg = JSON.parse(errBody).error || errMsg; } catch {}
        if (res.status === 429) { errMsg = "请求太频繁，请稍等片刻"; }
        throw new Error(errMsg);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("连接失败");

      const decoder = new TextDecoder();
      let fullText = "";
      let lastChunkTime = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        lastChunkTime = Date.now();
        const metaIdx = fullText.indexOf("---META---");
        setStreamText(metaIdx >= 0 ? fullText.substring(0, metaIdx).trim() : fullText);
      }

      if (!fullText.trim()) throw new Error("AI返回为空，请重试");

      const metaIdx = fullText.indexOf("---META---");
      const storyText = metaIdx >= 0 ? fullText.substring(0, metaIdx).trim() : fullText;
      const metaJson = metaIdx >= 0 ? fullText.substring(metaIdx + 10).trim() : fullText;
      const json = extractJson(metaJson);

      // If JSON parse fails but we have text, still show it
      if (!json && storyText) {
        setStreamText(storyText);
        setError("选项解析失败，请刷新页面继续");
        setStreaming(false);
        return;
      }
      if (!json) throw new Error("AI返回格式异常，请重试");

      const segment: StorySegment = {
        chapter: currentState.chapter,
        text: storyText,
        choices: (json.choices || []).map((c: any) => ({ text: c.text, effects: c.effects || {} })),
        chosen: -1,
      };

      setStreamText(storyText);
      setChoices(segment.choices);
      setState(prev => prev ? { ...prev, summary: json.summary || prev.summary, history: [...prev.history, segment] } : prev);

    } catch (e: any) {
      clearTimeout(loadingTimer);
      if (e.name === "AbortError") {
        setError("AI响应超时，请重试");
      } else {
        setError(e.message || "生成失败，请重试");
      }
    }
    // Show chapter transition
    setTransition({ show: true, chapter: currentState.chapter });
    setTimeout(() => setTransition({ show: false, chapter: 0 }), 1200);
    setStreaming(false);
  };

  // ===== Player Choice =====
  // Credit check (client-side)
  const consumeCredit = (): boolean => {
    const guestKey = "guest_credits";
    const userKey = token ? "credits_" + token.substring(0, 8) : guestKey;
    const stored = localStorage.getItem(userKey);
    let credits = stored ? parseInt(stored) : (token ? 30 : 5);
    if (credits <= 0) {
      setError("生成次数已用完" + (token ? "" : "，注册登录赠送30次"));
      return false;
    }
    credits--;
    localStorage.setItem(userKey, String(credits));
    return true;
  };

  // Undo: go back to previous chapter
  const handleUndo = () => {
    if (!state || !charPreset) return;
    if (state.history.length <= 1) return;
    // Remove last entry and restore previous state
    const newHistory = state.history.slice(0, -1);
    const prevChapter = newHistory.length > 0 ? newHistory[newHistory.length - 1].chapter : 1;
    const prevState: GameState = {
      ...state,
      chapter: prevChapter,
      history: newHistory,
    };
    setState(prevState);
    const last = newHistory[newHistory.length - 1];
    if (last) {
      setStreamText(last.text);
      setChoices(last.choices);
    }
    setGameOverMsg(null);
    setError("");
  };

  const handleChoice = (index: number) => {
    if (!state || !world || !charPreset) return;
    if (!consumeCredit()) return;

    const segment = state.history[state.history.length - 1];
    if (!segment) return;
    const choice = segment.choices[index];
    segment.chosen = index;

    const newStats = applyEffects(state.stats, choice.effects);
    const gameOver = checkGameOver(newStats, world.stats);

    const nextState: GameState = { ...state, stats: newStats, chapter: state.chapter + 1, history: [...state.history] };
    setState(nextState);

    if (token) {
      fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, worldId, character: charName, chapter: nextState.chapter, stats: nextState.stats, summary: nextState.summary, historyJson: JSON.stringify(nextState.history) }),
      }).catch(() => {});
    }

    if (gameOver) { setGameOverMsg(gameOver); return; }
    generate(nextState, world!, charPreset!);
  };

  const handleShare = async () => {
    if (!state || !world) return;
    const lines = ["【" + world.name + "】" + state.character, ""];
    state.history.forEach(h => {
      lines.push("第" + h.chapter + "章");
      lines.push(h.text);
      if (h.chosen >= 0) lines.push("> " + h.choices[h.chosen]?.text || "");
      lines.push("");
    });
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      alert("已复制到剪贴板");
    } catch { alert("复制失败"); }
  };

  if (!world || !charPreset) return null;

  return (
    <div className="min-h-screen flex justify-center">
      <div className="w-full max-w-2xl px-3 sm:px-6 py-4 sm:py-8 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">{world.icon}</span>
            <span className="text-sm text-slate-400">{world.name}</span>
            <span className="text-xs text-slate-600">| 第{state?.chapter ?? 1}章</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-3 text-xs text-slate-400">
              {state && world.stats.slice(0, 4).map(s => (
                <span key={s.key} className={s.key === "hp" && (state.stats[s.key] ?? 0) < 20 ? "text-red-400" : ""}>
                  {s.icon} {state.stats[s.key] ?? 0}
                </span>
              ))}
            </div>
            <button onClick={handleUndo} disabled={!state || state.history.length <= 1} className="text-xs text-slate-500 hover:text-white disabled:opacity-30">↩ 回退</button>
            <button onClick={() => router.push("/account")} className="text-xs text-slate-500 hover:text-white hidden sm:inline">👤 我的</button>
            <button onClick={() => router.push("/")} className="text-xs text-slate-500 hover:text-white">🏠</button>
            <button onClick={() => setShowHistory(!showHistory)} className="text-xs text-slate-500 hover:text-white">📜</button>
            <button onClick={handleShare} disabled={!state || state.history.length === 0} className="text-xs text-slate-500 hover:text-white disabled:opacity-30">📤 分享</button>
            {state && state.history.length > 0 && (
              <button onClick={() => exportStory(state, world!.name)} className="text-xs text-slate-500 hover:text-white">📥 导出</button>
            )}
          </div>
        </div>

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-6 mb-4 max-h-[calc(100vh-280px)]">

          {state?.history.filter(h => h.chosen >= 0).map((seg, i) => (
            <div key={i} className="space-y-2">
              <p className="text-xs text-slate-600">第 {seg.chapter} 章</p>
              <p className="text-base leading-8 text-slate-300">{seg.text}</p>
              <div className="ml-4 border-l-2 border-novel-accent/30 pl-3 text-sm text-slate-500 italic">
                你选择了：{seg.choices[seg.chosen]?.text ?? "..."}
              </div>
            </div>
          ))}

          <div>
            <p className="text-xs text-slate-600 mb-2">第 {state?.chapter ?? 1} 章</p>
            {state?.history.length === 0 && !streaming ? (
              <p className="text-base leading-8 text-slate-500 italic">故事即将开始...</p>
            ) : (
              <p className="text-base leading-8 text-slate-200">
                {streamText || "..."}
                {streaming && <span className="typing-cursor" />}
              </p>
            )}
            {streaming && <p className="text-xs text-slate-600 mt-2 animate-pulse">AI 正在构思...</p>}
          </div>

          {gameOverMsg && (
            <div className="text-center py-12 space-y-6">
              <p className="text-2xl">💀</p>
              <p className="text-lg text-red-400">{gameOverMsg}</p>
              <button onClick={() => router.push("/")} className="px-6 py-2 bg-novel-accent/20 border border-novel-accent/40 rounded-lg text-novel-accent hover:bg-novel-accent/30">重新开始</button>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-900/20 border border-red-800/30 rounded-lg text-sm text-red-400">
              {error}
              <button onClick={() => state && charPreset && generate(state, world!, charPreset)} className="ml-3 underline">重试</button>
            </div>
          )}
        </div>

        {/* Choices */}
        {choices.length > 0 && !gameOverMsg && (
          <div ref={choicesRef} className="space-y-2 pb-4">
            <p className="text-xs text-slate-500 mb-2">做出你的选择：</p>
            {choices.map((c, i) => (
              <button key={i} onClick={() => handleChoice(i)} disabled={streaming}
                className="w-full text-left p-4 bg-novel-panel/80 border border-slate-700/50 rounded-lg hover:border-novel-accent/50 hover:bg-novel-panel transition-all group disabled:opacity-50">
                <div className="flex items-center gap-3">
                  <span className="text-novel-accent text-sm font-bold">{i + 1}</span>
                  <span className="text-sm text-slate-300 group-hover:text-white">{c.text}</span>
                </div>
                {c.effects && Object.entries(c.effects).length > 0 && (
                  <div className="flex gap-2 ml-7 mt-1.5">
                    {Object.entries(c.effects).map(([k, v]) => (
                      <span key={k} className={`text-xs px-1.5 py-0.5 rounded ${v > 0 ? "text-green-400 bg-green-900/20" : "text-red-400 bg-red-900/20"}`}>
                        {world!.stats.find(s => s.key === k)?.icon} {k} {v > 0 ? "+" + v : v}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* History sidebar */}
        {showHistory && (
          <div className="fixed right-0 top-0 h-full w-80 bg-novel-panel/95 border-l border-slate-800 p-6 overflow-y-auto z-20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">剧情回顾</h3>
              <button onClick={() => setShowHistory(false)} className="text-xs text-slate-500">关闭</button>
            </div>
            {state?.history.map((seg, i) => (
              <div key={i} className="mb-4 pb-3 border-b border-slate-800/50">
                <p className="text-xs text-slate-600 mb-1">第{seg.chapter}章</p>
                <p className="text-xs text-slate-400 line-clamp-3">{seg.text}</p>
                <p className="text-xs text-novel-accent mt-1">→ {seg.choices[seg.chosen]?.text ?? "..."}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chapter transition overlay */}
      {transition.show && (
        <div className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="animate-in fade-in zoom-in duration-500">
            <p className="text-6xl font-bold text-novel-accent drop-shadow-lg">第{transition.chapter}章</p>
          </div>
        </div>
      )}
    </div>
  );
}

function exportStory(state: GameState, worldName: string) {
  const lines: string[] = [];
  lines.push(worldName);
  lines.push("=".repeat(30));
  lines.push("");
  for (const seg of state.history) {
    lines.push(`第${seg.chapter}章`);
    lines.push(seg.text);
    lines.push("");
    if (seg.chosen >= 0) {
      lines.push(`> 选择：${seg.choices[seg.chosen]?.text ?? "..."}`);
      lines.push("");
    }
  }
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${worldName}_第${state.history.length}章.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function extractJson(text: string) {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
  } catch {
    try {
      let cleaned = text.replace(/```json\s*|```\s*/g, "").replace(/,\s*([}\]])/g, "$1");
      const s = cleaned.indexOf("{"), e = cleaned.lastIndexOf("}");
      if (s >= 0 && e > s) return JSON.parse(cleaned.slice(s, e + 1));
    } catch {}
  }
  return null;
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-slate-400">加载中...</div>}>
      <PlayContent />
    </Suspense>
  );
}
