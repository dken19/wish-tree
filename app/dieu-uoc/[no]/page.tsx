import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { THEMES, isThemeKey } from '@/lib/themes'
import { formatNo } from '@/lib/wishMeta'
import { getWishByNo, parseWishNo } from '@/lib/wishDetail'
import WishDetail from './WishDetail'

// ISR: dựng lần đầu khi có người mở, giữ 5 phút; đổi skin/tiến độ/trạng thái thì
// revalidateWishPage() làm mới ngay (lib/wishDetail). [] = không dựng sẵn lúc build.
export const revalidate = 300
export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ no: string }> }

/** Cắt mô tả cho thẻ chia sẻ (Facebook/Zalo hiện ~150 ký tự). */
function clip(s: string, n: number) {
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t
}

// Metadata cho ứng dụng thứ 3 (Facebook, Zalo, Messenger, X, Telegram, Discord…):
// og:title/description/url/type + twitter card lớn; ảnh lấy từ opengraph-image.tsx/twitter-image.tsx cùng thư mục.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const no = parseWishNo((await params).no)
  const w = no ? await getWishByNo(no) : null
  if (!w) return { title: 'Không tìm thấy điều ước', robots: { index: false } }

  const theme = isThemeKey(w.theme) ? THEMES[w.theme].label : 'Điều ước'
  const who = w.author || 'Một người ẩn danh'
  const title = `Điều ước ${formatNo(w.no)} · ${theme}${w.achieved ? ' · Đã đạt được' : ''}`
  const description = clip(`“${w.text}” — ${who} treo trên Cây Ước Nguyện.`, 160)
  const url = `/dieu-uoc/${w.no}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      locale: 'vi_VN',
      siteName: 'Cây Ước Nguyện',
      url,
      title,
      description,
      publishedTime: w.createdAt ? new Date(w.createdAt).toISOString() : undefined,
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function WishDetailPage({ params }: Props) {
  const no = parseWishNo((await params).no)
  const w = no ? await getWishByNo(no) : null
  if (!w) notFound()
  // JSON-LD: mỗi điều ước là một CreativeWork ngắn (cho Google + AI agent trích dẫn đúng)
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: `Điều ước ${formatNo(w.no)}`,
    text: w.text,
    inLanguage: 'vi-VN',
    url: `https://cayuocnguyen.io.vn/dieu-uoc/${w.no}`,
    genre: isThemeKey(w.theme) ? THEMES[w.theme].label : undefined,
    dateCreated: w.createdAt ? new Date(w.createdAt).toISOString() : undefined,
    author: { '@type': 'Person', name: w.author || 'Ẩn danh' },
    commentCount: w.commentCount,
    isPartOf: { '@id': 'https://cayuocnguyen.io.vn/#website' },
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <WishDetail wish={w} />
    </>
  )
}
