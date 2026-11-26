import { NextResponse, type NextRequest } from 'next/server'

// Thương lượng nội dung cho AI agent: request có `Accept: text/markdown` -> rewrite sang bản Markdown
// (app/md/[[...path]]/route.ts, nội dung ở lib/agentContent). Trình duyệt thường KHÔNG chạy proxy:
// matcher chỉ khớp khi header Accept có "text/markdown" -> không tốn gì cho người dùng thật.
export function proxy(req: NextRequest) {
  const accept = req.headers.get('accept') ?? ''
  // ưu tiên HTML nếu client chấp nhận cả hai và HTML đứng trước
  const iMd = accept.indexOf('text/markdown')
  const iHtml = accept.indexOf('text/html')
  if (iMd < 0 || (iHtml >= 0 && iHtml < iMd)) return NextResponse.next()
  const url = req.nextUrl.clone()
  url.pathname = `/md${req.nextUrl.pathname === '/' ? '' : req.nextUrl.pathname}`
  const res = NextResponse.rewrite(url)
  res.headers.set('Vary', 'Accept')
  return res
}

export const config = {
  matcher: [
    {
      // bỏ qua API, file tĩnh, ảnh OG, llms*.txt, chính route /md
      source: '/((?!api|md|_next|llms|.*\\.[a-z0-9]+$|.*opengraph-image|.*twitter-image).*)',
      has: [{ type: 'header', key: 'accept', value: '.*text/markdown.*' }],
    },
  ],
}
