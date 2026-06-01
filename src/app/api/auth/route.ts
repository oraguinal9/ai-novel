import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { email, password, action } = (await req.json()) as {
    email: string; password: string; action: "login" | "signup";
  };

  if (action === "signup") {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ token: data.session?.access_token });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ token: data.session.access_token });
}
