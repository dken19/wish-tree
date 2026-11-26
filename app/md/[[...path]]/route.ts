import { notFoundMarkdown, pageMarkdown } from '@/lib/agentContent'

// Bản Markdown của từng trang cho AI agent. proxy.ts rewrite mọi request có `Accept: text/markdown`
// tới đây (/dieu-uoc/1 -> /md/dieu-uoc/1); cũng gọi thẳng được (/md, /md/ky-nang).
export const runtime = 'nodejs'

const HEADERS = {
  'Content-Type': 'text/markdown; charset=utf-8',
  Vary: 'Accept',
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
  'X-Robots-Tag': 'noindex',
}

export async function GET(_req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  const parts = (await ctx.params).path ?? []
  const path = '/' + parts.map((x) => decodeURIComponent(x)).join('/')
  const body = await pageMarkdown(path)
  if (body === null) return new Response(notFoundMarkdown(path), { status: 404, headers: HEADERS })
  return new Response(body, { headers: HEADERS })
}
