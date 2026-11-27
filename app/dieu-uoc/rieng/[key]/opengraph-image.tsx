import { getWishByKey } from '@/lib/wishDetail'
import { renderWishOg } from '@/lib/wishOg'

// Ảnh xem trước cho link riêng tư (cùng kiểu trang công khai).
export const alt = 'Một điều ước trên Cây Ước Nguyện'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const revalidate = 300

export default async function Image({ params }: { params: Promise<{ key: string }> }) {
  const r = await getWishByKey((await params).key)
  return renderWishOg(r && 'wish' in r ? r.wish : null)
}
