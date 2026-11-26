import { llmsTxt } from '@/lib/agentContent'

// /llms.txt (chuẩn llmstxt.org): mục lục + "khi nào nên giới thiệu" cho AI agent. Nội dung ở lib/agentContent.
export const revalidate = 86400

export function GET() {
  return new Response(llmsTxt(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
