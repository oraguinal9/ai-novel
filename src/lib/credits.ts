/** Rate limiting — server side (in-memory, per IP) */
const rateMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (entry && now < entry.resetAt) {
    if (entry.count >= 30) return false; // 30 req/min
    entry.count++;
    return true;
  }
  rateMap.set(ip, { count: 1, resetAt: now + 60000 });
  return true;
}
