import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { email } = (await req.json()) as { email: string };
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: "http://localhost:3003/account" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
