// Rate-limit đơn giản theo IP (in-memory). Đủ cho MVP; production nên dùng KV/Redis.
type Bucket = { count: number; reset: number }
const buckets = new Map<string, Bucket>()

export function rateLimit(
  key: string,
  limit = 5,
  windowMs = 10 * 60 * 1000
): { ok: boolean; remaining: number } {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    return { ok: true, remaining: limit - 1 }
  }
  if (b.count >= limit) return { ok: false, remaining: 0 }
  b.count += 1
  return { ok: true, remaining: limit - b.count }
}

export function ipFromHeaders(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return headers.get('x-real-ip') ?? 'unknown'
}
