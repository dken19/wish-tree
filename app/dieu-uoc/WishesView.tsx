'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { THEMES, THEME_KEYS, isThemeKey, type ThemeKey } from '@/lib/themes'

type Item = {
  id: string
  text: string
  theme: string
  author: string | null
  createdAt: number
}

type Resp = {
  items: Item[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

// Dãy số trang rút gọn: 1 … p-1 p p+1 … N (dùng số âm làm dấu "…").
function pageList(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out: number[] = [1]
  const from = Math.max(2, current - 1)
  const to = Math.min(total - 1, current + 1)
  if (from > 2) out.push(-1)
  for (let p = from; p <= to; p++) out.push(p)
  if (to < total - 1) out.push(-2)
  out.push(total)
  return out
}

export default function WishesView() {
  const router = useRouter()
  const params = useSearchParams()

  const themeParam = params.get('theme')
  const theme: ThemeKey | null = isThemeKey(themeParam) ? themeParam : null
  const page = Math.max(1, Number(params.get('page')) || 1)

  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Cập nhật URL (?theme=&page=) -> điều khiển dữ liệu + chia sẻ link + nút back.
  const navigate = useCallback(
    (nextTheme: ThemeKey | null, nextPage: number) => {
      const q = new URLSearchParams()
      if (nextTheme) q.set('theme', nextTheme)
      if (nextPage > 1) q.set('page', String(nextPage))
      const qs = q.toString()
      router.push(qs ? `/dieu-uoc?${qs}` : '/dieu-uoc')
    },
    [router]
  )

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    const q = new URLSearchParams({ page: String(page) })
    if (theme) q.set('theme', theme)
    fetch(`/api/wishes/list?${q.toString()}`)
      .then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
      .then(({ ok, body }) => {
        if (!alive) return
        if (ok && Array.isArray(body.items)) setData(body as Resp)
        else setError(body?.error ?? 'Không tải được danh sách, thử lại nhé')
      })
      .catch(() => {
        if (alive) setError('Không tải được danh sách, thử lại nhé')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [theme, page])

  const totalPages = data?.totalPages ?? 1

  return (
    <div className="wishes-page">
      <div className="wishes-inner">
        <Link href="/" className="wishes-back">
          ← Về cây ước nguyện
        </Link>

        <header className="wishes-hero">
          <h1>Tất cả điều ước 📜</h1>
          <p>
            Những điều ước đã được treo lên cây. Lọc theo chủ đề, lật từng trang để đọc dần.
          </p>
        </header>

        <div className="wishes-filters">
          <button
            className={`wf-chip${!theme ? ' on' : ''}`}
            onClick={() => navigate(null, 1)}
          >
            Tất cả
          </button>
          {THEME_KEYS.map((k) => {
            const on = k === theme
            return (
              <button
                key={k}
                className={`wf-chip${on ? ' on' : ''}`}
                style={on ? { background: THEMES[k].color, borderColor: THEMES[k].color } : undefined}
                onClick={() => navigate(k, 1)}
              >
                {THEMES[k].label}
              </button>
            )
          })}
        </div>

        {loading && <p className="wishes-status">Đang tải…</p>}
        {error && <p className="wishes-status err">{error}</p>}
        {!loading && !error && data && data.items.length === 0 && (
          <p className="wishes-status">Chưa có điều ước nào ở chủ đề này.</p>
        )}

        {!loading && !error && data && data.items.length > 0 && (
          <>
            <div className="wishes-grid">
              {data.items.map((w) => {
                const tk = isThemeKey(w.theme) ? w.theme : null
                const color = tk ? THEMES[tk].color : '#9a8472'
                return (
                  <article key={w.id} className="wish-tile" style={{ borderTopColor: color }}>
                    <span className="wt-theme" style={{ color }}>
                      {tk ? THEMES[tk].label : w.theme}
                    </span>
                    <p className="wt-text">{w.text}</p>
                    {w.author && <span className="wt-author">— {w.author}</span>}
                  </article>
                )
              })}
            </div>

            {totalPages > 1 && (
              <nav className="wishes-pager" aria-label="Phân trang">
                <button
                  className="wp-btn"
                  disabled={page <= 1}
                  onClick={() => navigate(theme, page - 1)}
                >
                  ‹
                </button>
                {pageList(page, totalPages).map((p, i) =>
                  p < 0 ? (
                    <span key={`gap${i}`} className="wp-gap">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      className={`wp-btn${p === page ? ' on' : ''}`}
                      onClick={() => navigate(theme, p)}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  className="wp-btn"
                  disabled={page >= totalPages}
                  onClick={() => navigate(theme, page + 1)}
                >
                  ›
                </button>
              </nav>
            )}

            <p className="wishes-count">
              {data.total} điều ước · trang {page}/{totalPages}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
