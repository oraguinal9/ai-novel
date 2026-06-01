import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import crypto from "crypto";

const SECRET = "zbjh_auto_deploy_2026";
const REPO_PATH = "/root/ai-novel";

function run(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: REPO_PATH, timeout: 120000 }, (err, stdout, stderr) => {
      if (err) reject(stderr || err.message);
      else resolve(stdout);
    });
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("x-hub-signature-256") || "";

  // Verify HMAC
  const expected = "sha256=" + crypto.createHmac("sha256", SECRET).update(body).digest("hex");
  if (sig !== expected) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  try {
    const result = await run("git pull origin main 2>&1 && npm install --omit=dev 2>&1 && npx next build 2>&1 && pm2 restart ai-novel 2>&1");
    return NextResponse.json({ success: true, output: result.substring(0, 500) });
  } catch (e: any) {
    return NextResponse.json({ error: e.toString().substring(0, 300) }, { status: 500 });
  }
}
