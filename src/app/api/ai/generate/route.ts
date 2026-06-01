import { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/credits";

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: "太快了，请稍等片刻" }), { status: 429, headers: { "Content-Type": "application/json" } });
  }

  const { prompt } = (await req.json()) as { prompt: string };

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: "API key missing" }), { status: 500 });

  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.85,
      max_tokens: 2048,
      stream: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return new Response(JSON.stringify({ error: `AI API error: ${err}` }), { status: 500 });
  }

  // Stream the SSE response to client
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = res.body?.getReader();
      if (!reader) { controller.close(); return; }

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") { controller.close(); return; }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            } catch {
              // skip malformed
            }
          }
        }
      } catch (e) {
        console.error("Stream error:", e);
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
