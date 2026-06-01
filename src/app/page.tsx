"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WORLDS, type WorldConfig, type CharacterPreset } from "@/game/worlds";
import { AuthDialog } from "@/components/AuthDialog";

export default function HomePage() {
  const router = useRouter();
  const [selectedWorld, setSelectedWorld] = useState<WorldConfig | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [saves, setSaves] = useState<any[]>([]);
  const [showAuth, setShowAuth] = useState(false);
  const [search, setSearch] = useState("");

  // Popularity: localStorage counter per world
  const getPopularity = (): Record<string, number> => {
    try { return JSON.parse(localStorage.getItem("world_pop") || "{}"); } catch { return {}; }
  };
  const recordPopularity = (w: WorldConfig) => {
    const pop = getPopularity();
    pop[w.id] = (pop[w.id] || 0) + 1;
    localStorage.setItem("world_pop", JSON.stringify(pop));
  };

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) { setToken(t); loadSaves(t); }
  }, []);

  const loadSaves = async (t: string) => {
    try { const res = await fetch("/api/save?token=" + t); if (res.ok) setSaves(await res.json()); } catch {}
  };

  const deleteSave = async (saveId: string) => {
    if (!token || !confirm("确定删除这个存档？")) return;
    await fetch("/api/save?token=" + token + "&id=" + saveId, { method: "DELETE" });
    loadSaves(token);
  };

  const handleAuth = (t: string) => { localStorage.setItem("token", t); setToken(t); loadSaves(t); };

  const handleSelect = (char: CharacterPreset) => {
    if (!selectedWorld) return;
    const params = new URLSearchParams({ world: selectedWorld.id, character: char.name });
    if (token) params.set("token", token);
    router.push("/play?" + params.toString());
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="text-center pt-16 pb-8">
        <h1 className="text-5xl font-bold text-white mb-3 tracking-wider">
          AI 互动<span className="text-novel-accent">小说</span>
        </h1>
        <p className="text-slate-400 text-lg">AI 实时生成 · 你的选择改变一切</p>
      </div>

      {/* Saved games */}
      {token && saves.length > 0 && (
        <div className="max-w-lg mx-auto px-6 mb-4">
          <p className="text-sm text-slate-400 mb-2">📂 存档记录</p>
          <div className="space-y-2">
            {saves.map((s: any) => {
              const w = WORLDS.find(w => w.id === s.world_id);
              return (
                <div key={s.id} className="flex items-center gap-2 p-3 bg-novel-panel/80 border border-slate-700/50 rounded-lg group">
                  <button onClick={() => {
                    const params = new URLSearchParams({ world: s.world_id, character: s.character, load: "true" });
                    if (token) params.set("token", token);
                    router.push("/play?" + params.toString());
                  }} className="flex-1 flex items-center gap-2 text-left">
                    <span>{w?.icon}</span>
                    <span className="text-white font-bold text-sm">{w?.name}</span>
                    <span className="text-slate-400 text-xs">· {s.character}</span>
                    <span className="text-slate-500 text-xs ml-auto">第{s.chapter}章 · {new Date(s.updated_at).toLocaleDateString("zh-CN")}</span>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteSave(s.id); }}
                    className="text-slate-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-all shrink-0">
                    🗑️
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!selectedWorld ? (
        <>
          <p className="text-center text-sm text-slate-500 mb-4">选择世界观</p>
          {/* Search */}
          <div className="max-w-xs mx-auto mb-6 px-4">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="搜索世界观..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-novel-accent" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 px-4 max-w-3xl mx-auto">
            {(search ? WORLDS.filter(w => w.name.includes(search) || w.desc.includes(search)) : WORLDS).map(w => {
              const pop = getPopularity();
              const count = pop[w.id] || 0;
              return (
              <button key={w.id} onClick={() => { recordPopularity(w); setSelectedWorld(w); }}
                className="p-4 bg-novel-panel/80 border border-slate-700/50 rounded-xl text-left hover:border-novel-accent/50 transition-all group relative">
                {count > 0 && <span className="absolute top-1 right-1 text-[10px] opacity-60">{count}次</span>}
                <div className="text-3xl mb-2">{w.icon}</div>
                <h3 className="text-lg font-bold text-white mb-1">{w.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{w.desc}</p>
              </button>
            );
            })}
          </div>
        </>
      ) : (
        <div>
          <button onClick={() => setSelectedWorld(null)} className="text-sm text-slate-500 hover:text-white mb-4 ml-6 inline-block">← 换个世界观</button>
          <div className="max-w-lg mx-auto px-6 mb-4">
            <div className="p-5 bg-novel-panel/60 border border-slate-700/30 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{selectedWorld.icon}</span>
                <h2 className="text-xl font-bold text-white">{selectedWorld.name}</h2>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">{selectedWorld.desc}</p>
            </div>
          </div>
          <p className="text-center text-sm text-slate-500 mb-4">选择你的身份</p>
          <div className="grid sm:grid-cols-2 gap-4 px-4 max-w-2xl mx-auto">
            {selectedWorld.characters.map(c => (
              <button key={c.name} onClick={() => handleSelect(c)}
                className="w-full p-4 sm:p-5 bg-novel-panel/80 border border-slate-700/50 rounded-xl text-left hover:border-novel-accent/50 transition-all group">
                <h3 className="text-base sm:text-lg font-bold text-white mb-2">{c.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-2 sm:mb-3 line-clamp-4 sm:line-clamp-none">{c.background}</p>
                <p className="text-xs text-novel-accent italic line-clamp-2">"{c.storyHook.slice(0, 60)}..."</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="text-center mt-4 flex items-center justify-center gap-4">
        {!token ? <button onClick={() => setShowAuth(true)} className="text-sm text-slate-500 hover:text-novel-accent">登录保存进度</button>
          : <>
            <button onClick={() => router.push("/account")} className="text-sm text-slate-400 hover:text-white">👤 我的</button>
            <button onClick={() => { localStorage.removeItem("token"); setToken(null); setSaves([]); }} className="text-sm text-slate-500 hover:text-slate-300">退出</button>
          </>}
      </div>

      <div className="mt-auto py-4 text-center text-xs text-slate-600 space-x-4">
        <Link href="/help" className="hover:text-slate-400 transition-colors">使用手册</Link>
        <span>AI驱动 · 实时生成 · 每个选择都有代价</span>
      </div>

      <AuthDialog open={showAuth} onClose={() => setShowAuth(false)} onAuth={handleAuth} />
    </div>
  );
}
