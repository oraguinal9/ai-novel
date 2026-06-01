"use client";

import { useState } from "react";

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
  onAuth: (token: string) => void;
}

export function AuthDialog({ open, onClose, onAuth }: AuthDialogProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [action, setAction] = useState<"login" | "signup">("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "认证失败");
      onAuth(data.token);
      onClose();
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative bg-novel-panel border border-slate-700 rounded-xl p-6 w-80 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-white">
          {action === "login" ? "登录" : "注册"}
        </h3>
        <input
          type="email"
          placeholder="邮箱"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-novel-accent"
        />
        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-novel-accent"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={loading || !email || !password}
          className="w-full py-2 bg-novel-accent text-black font-bold rounded hover:bg-amber-400 disabled:opacity-50 transition-colors"
        >
          {loading ? "..." : action === "login" ? "登录" : "注册"}
        </button>
        <p className="text-xs text-slate-500 text-center">
          {action === "login" ? "没有账号？" : "已有账号？"}
          <button
            onClick={() => { setAction(action === "login" ? "signup" : "login"); setError(""); }}
            className="text-novel-accent ml-1 hover:underline"
          >
            {action === "login" ? "注册" : "登录"}
          </button>
        </p>
      </div>
    </div>
  );
}
