"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { WORLDS } from "@/game/worlds";

export default function AccountPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [saves, setSaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"saves" | "password">("saves");
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) { router.push("/"); return; }
    setToken(t);
    fetchSaves(t);
  }, []);

  const fetchSaves = async (t: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/save?token=" + t);
      if (res.ok) {
        const data = await res.json();
        setSaves(Array.isArray(data) ? data : []);
      }
    } catch {}
    setLoading(false);
  };

  const deleteSave = async (id: string) => {
    if (!token || !confirm("确定删除？")) return;
    await fetch("/api/save?token=" + token + "&id=" + id, { method: "DELETE" });
    fetchSaves(token);
  };

  const handleChangePwd = async () => {
    if (!token || !oldPwd || !newPwd) { setPwdMsg("请填写所有字段"); return; }
    if (newPwd.length < 6) { setPwdMsg("密码至少6位"); return; }
    setPwdLoading(true); setPwdMsg("");
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, oldPassword: oldPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (res.ok) { setPwdMsg("密码修改成功"); setOldPwd(""); setNewPwd(""); }
      else setPwdMsg(data.error || "修改失败");
    } catch { setPwdMsg("网络错误"); }
    setPwdLoading(false);
  };

  const handleResetPassword = async () => {
    const emailAddr = prompt("请输入注册邮箱：");
    if (!emailAddr) return;
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailAddr }),
      });
      const data = await res.json();
      if (res.ok) alert("重置链接已发送到 " + emailAddr);
      else alert("发送失败：" + (data.error || "请重试"));
    } catch { alert("网络错误"); }
  };

  const handleLogout = () => { localStorage.removeItem("token"); router.push("/"); };
  if (!token) return null;

  return (
    <div className="min-h-screen bg-novel-bg">
      <div className="max-w-lg mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => router.push("/")} className="text-sm text-slate-500 hover:text-white">← 返回首页</button>
          <h1 className="text-xl font-bold text-white">我的</h1>
          <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300">退出</button>
        </div>

        <div className="flex gap-4 mb-6 border-b border-slate-800">
          <button onClick={() => setTab("saves")} className={"pb-2 text-sm " + (tab === "saves" ? "text-novel-accent border-b-2 border-novel-accent" : "text-slate-500 hover:text-white")}>存档记录 ({saves.length})</button>
          <button onClick={() => setTab("password")} className={"pb-2 text-sm " + (tab === "password" ? "text-novel-accent border-b-2 border-novel-accent" : "text-slate-500 hover:text-white")}>修改密码</button>
        </div>

        {tab === "saves" && (
          <div className="space-y-3">
            {loading ? (
              <p className="text-slate-500 text-sm text-center py-8">加载中...</p>
            ) : saves.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500 text-sm mb-2">暂无存档</p>
                <button onClick={() => router.push("/")} className="text-sm text-novel-accent hover:underline">去开始一段冒险 →</button>
              </div>
            ) : saves.map((s: any) => {
              const w = WORLDS.find(w => w.id === s.world_id);
              return (
                <div key={s.id} className="flex items-center gap-3 p-4 bg-novel-panel/80 border border-slate-700/50 rounded-lg group">
                  <button onClick={() => { router.push("/play?world=" + s.world_id + "&character=" + encodeURIComponent(s.character) + "&load=true&token=" + token); }} className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{w?.icon}</span>
                      <span className="text-white font-bold">{w?.name || s.world_id}</span>
                      <span className="text-slate-400 text-xs">· {s.character}</span>
                    </div>
                    <div className="text-xs text-slate-500 ml-8">第{s.chapter}章 · {s.updated_at ? new Date(s.updated_at).toLocaleDateString("zh-CN") : ""}</div>
                  </button>
                  <button onClick={() => deleteSave(s.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-lg">🗑️</button>
                </div>
              );
            })}
          </div>
        )}

        {tab === "password" && (
          <div className="space-y-4">
            <div><label className="text-xs text-slate-400 block mb-1">当前密码</label><input type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-novel-accent" /></div>
            <div><label className="text-xs text-slate-400 block mb-1">新密码</label><input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-novel-accent" /></div>
            {pwdMsg && <p className={"text-xs " + (pwdMsg.includes("成功") ? "text-green-400" : "text-red-400")}>{pwdMsg}</p>}
            <button onClick={handleChangePwd} disabled={pwdLoading} className="w-full py-2 bg-novel-accent text-black font-bold rounded text-sm hover:bg-amber-400 disabled:opacity-50">{pwdLoading ? "..." : "修改密码"}</button>
            <div className="pt-4 border-t border-slate-800"><p className="text-xs text-slate-500 mb-2">忘记密码？</p><button onClick={handleResetPassword} className="text-sm text-novel-accent hover:underline">发送密码重置邮件</button></div>
          </div>
        )}
      </div>
    </div>
  );
}
