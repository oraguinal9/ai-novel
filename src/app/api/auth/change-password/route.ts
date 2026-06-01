import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { token, oldPassword, newPassword } = (await req.json()) as { token: string; oldPassword: string; newPassword: string };
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  // Re-auth with old password first
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email!, password: oldPassword });
  if (signInErr) return NextResponse.json({ error: "当前密码错误" }, { status: 400 });

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
