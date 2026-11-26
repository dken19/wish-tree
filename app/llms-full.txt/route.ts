import { llmsFullTxt } from '@/lib/agentContent'

// /llms-full.txt: toàn bộ nội dung Markdown (tính năng, kỹ năng sống, 20 điều ước mới nhất). Làm mới mỗi giờ.
export const revalidate = 3600

export async function GET() {
  return new Response(await llmsFullTxt(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
