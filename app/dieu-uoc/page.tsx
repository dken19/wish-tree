import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import PageShell from '@/components/ui/PageShell'
import { latestWishes } from '@/lib/agentContent'
import { THEMES, isThemeKey } from '@/lib/themes'
import { formatNo, splitWishTime } from '@/lib/wishMeta'
import WishesView from './WishesView'

export const metadata: Metadata = {
  title: 'Tất cả điều ước — đọc điều ước của mọi người',
  description:
    'Đọc tất cả điều ước mọi người đã viết và thả lên Cây Ước Nguyện — lọc theo chủ đề (tình yêu, học hành, gia đình, sức khoẻ…) và lật từng trang.',
  alternates: { canonical: '/dieu-uoc' },
}

// HTML server có sẵn 12 điều ước mới nhất (fallback của Suspense) -> công cụ tìm kiếm / AI agent
// đọc được nội dung mà không cần chạy JS; client (WishesView) thay bằng bản có tìm kiếm/lọc.
export const revalidate = 300

export default async function DieuUocPage() {
  const latest = await latestWishes(12)
  const fallback = (
    <PageShell
      title="Tất cả điều ước"
      lead="Những điều ước đã treo lên cây. Tìm theo số hoặc từ khoá, lọc theo chủ đề và ngày gửi."
    >
      <h2 className="pg-count">Điều ước mới nhất</h2>
      <ol className="wl">
        {latest.map((w) => {
          const tk = isThemeKey(w.theme) ? w.theme : null
          const [day, time] = splitWishTime(w.createdAt)
          return (
            <li key={w.id} className="tk" style={{ '--tk-c': tk ? THEMES[tk].color : undefined } as React.CSSProperties}>
              <div className="tk-stub">
                {w.no ? (
                  <Link className="tk-no" href={`/dieu-uoc/${w.no}`}>
                    {formatNo(w.no)}
                  </Link>
                ) : null}
                {day && (
                  <span className="tk-date">
                    {day}
                    <br />
                    {time}
                  </span>
                )}
              </div>
              <div className="tk-body">
                <p className="tk-text">{w.text}</p>
                <div className="tk-meta">
                  <span className="tk-theme">{tk ? THEMES[tk].label : w.theme}</span>
                  <span>{w.author || 'Ẩn danh'}</span>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </PageShell>
  )
  return (
    <Suspense fallback={fallback}>
      <WishesView />
    </Suspense>
  )
}
