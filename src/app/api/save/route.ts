import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    token: string; worldId: string; character: string; chapter: number;
    stats: Record<string, number>; summary: string; historyJson: string;
  };

  const { data: { user }, error } = await supabase.auth.getUser(body.token);
  if (error || !user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { error: upsertErr } = await supabase.from("game_saves").upsert({
    user_id: user.id,
    world_id: body.worldId,
    character: body.character,
    chapter: body.chapter,
    stats: body.stats,
    summary: body.summary,
    history: body.historyJson,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data, error: fetchErr } = await supabase
    .from("game_saves")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function DELETE(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const saveId = req.nextUrl.searchParams.get("id");

  if (!token) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  if (saveId) {
    // Delete specific save
    const { error: delErr } = await supabase.from("game_saves").delete().eq("id", saveId).eq("user_id", user.id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  } else {
    // Delete all saves for user
    const { error: delErr } = await supabase.from("game_saves").delete().eq("user_id", user.id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
