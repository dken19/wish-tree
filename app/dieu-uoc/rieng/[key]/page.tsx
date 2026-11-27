import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { THEMES, isThemeKey } from '@/lib/themes'
import { formatNo, privateWishPath } from '@/lib/wishMeta'
import { getWishByKey } from '@/lib/wishDetail'
import WishDetail from '../../[no]/WishDetail'

// Điều ước RIÊNG TƯ: chỉ ai có link bí mật mới mở được. Không vào sitemap/danh sách/tìm kiếm, noindex.
// ISR như trang công khai; chủ đổi chế độ/skin -> revalidatePrivatePage làm mới ngay.
export const revalidate = 300
export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ key: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { key } = await params
  const r = await getWishByKey(key)
  const base: Metadata = { robots: { index: false, follow: false, nocache: true } }
  if (!r || !('wish' in r)) return { ...base, title: 'Không tìm thấy điều ước' }
  const w = r.wish
  const theme = isThemeKey(w.theme) ? THEMES[w.theme].label : 'Điều ước'
  const title = `Điều ước ${formatNo(w.no)} · ${theme}`
  // KHÔNG đưa lời ước vào mô tả: link riêng tư có thể bị dán vào nhóm chat đông người
  const description = `${w.author || 'Một người bạn'} gửi riêng cho bạn một điều ước trên Cây Ước Nguyện.`
  return {
    ...base,
    title,
    description,
    openGraph: { type: 'article', locale: 'vi_VN', siteName: 'Cây Ước Nguyện', url: privateWishPath(key), title, description },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function PrivateWishPage({ params }: Props) {
  const { key } = await params
  const r = await getWishByKey(key)
  if (!r) notFound()
  if ('publicNo' in r) permanentRedirect(`/dieu-uoc/${r.publicNo}`)
  return <WishDetail wish={r.wish} privateKey={key} />
}
