import { getWishByNo, parseWishNo } from '@/lib/wishDetail'
import { renderWishOg } from '@/lib/wishOg'

// Ảnh xem trước RIÊNG cho từng điều ước khi dán link vào Facebook/Zalo/Messenger/X/Telegram/Discord.
export const alt = 'Một điều ước treo trên Cây Ước Nguyện'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const revalidate = 300

export default async function Image({ params }: { params: Promise<{ no: string }> }) {
  const no = parseWishNo((await params).no)
  return renderWishOg(no ? await getWishByNo(no) : null)
}
