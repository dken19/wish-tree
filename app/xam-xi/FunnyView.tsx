'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { THEMES, isThemeKey } from '@/lib/themes'
import { formatNo, formatWishTime } from '@/lib/wishMeta'
import PageShell from '@/components/ui/PageShell'
import Icon from '@/components/ui/Icon'

type Item = { id: string; no: number | null; text: string; theme: string; note: string; createdAt: number }
type Resp = { items: Item[]; page: number; total: number; totalPages: number }

// "Góc xàm xí": điều ước admin đánh dấu vui (status 'funny') + lí do không duyệt. Không hiện tên người viết.
export default function FunnyView() {
  const router = useRouter()
  const params = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const [data, setData] = useState<Resp | null>(null)
  // trang đã tải xong gần nhất -> "đang tải" = khác trang hiện tại (không setState đồng bộ trong effect)
  const [doneFor, setDoneFor] = useState(0)
  const [error, setError] = useState('')
  const loading = doneFor !== page

  useEffect(() => {
    let alive = true
    fetch(`/api/wishes/funny?page=${page}`)
      .then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
      .then(({ ok, body }) => {
        if (!alive) return
        if (ok && Array.isArray(body.items)) {
          setData(body as Resp)
          setError('')
        } else setError(body?.error ?? 'Không tải được danh sách, thử lại nhé')
      })
      .catch(() => alive && setError('Không tải được danh sách, thử lại nhé'))
      .finally(() => alive && setDoneFor(page))
    return () => {
      alive = false
    }
  }, [page])

  const goPage = (p: number) => router.push(p > 1 ? `/xam-xi?page=${p}` : '/xam-xi')
  const totalPages = data?.totalPages ?? 1

  return (
    <PageShell
      title="Góc xàm xí"
      stats={
        <p className="fx-lead">
          Những điều ước không được treo lên cây, nhưng đọc thì vui. Mỗi tờ có kèm lời phê của người giữ cây.
          Tên người viết được giấu đi.
        </p>
      }
    >
      {error && <p className="pg-status err">{error}</p>}
      {!error && loading && !data && <p className="pg-status">Đang mở hộp xàm xí…</p>}
      {!error && data && data.items.length === 0 && (
        <p className="pg-status">
          Chưa có điều ước xàm xí nào. Mọi người đang ước rất nghiêm túc.{' '}
          <Link href="/dieu-uoc">Xem các điều ước trên cây</Link>
        </p>
      )}

      {data && data.items.length > 0 && (
        <ol className="wl" style={{ opacity: loading ? 0.6 : 1 }}>
          {data.items.map((w) => {
            const tk = isThemeKey(w.theme) ? w.theme : null
            return (
              <li
                key={w.id}
                className="tk fx"
                style={{ '--tk-c': tk ? THEMES[tk].color : undefined } as React.CSSProperties}
              >
                <div className="tk-stub">
                  {w.no ? <span className="tk-no">{formatNo(w.no)}</span> : null}
                  <span className="tk-date">{formatWishTime(w.createdAt)}</span>
                  <span className="tk-stamp">Xàm xí</span>
                </div>
                <div className="tk-body">
                  <p className="tk-text">{w.text}</p>
                  {w.note && (
                    <p className="fx-note">
                      <span className="fx-note-k">
                        <Icon name="smile" size={15} />
                        Lí do không duyệt
                      </span>
                      {w.note}
                    </p>
                  )}
                  <div className="tk-meta">
                    <span className="tk-theme">
                      <i className="pg-dot" style={{ background: tk ? THEMES[tk].color : undefined }} />
                      {tk ? THEMES[tk].label : w.theme}
                    </span>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {totalPages > 1 && (
        <nav className="pg-pager" aria-label="Phân trang">
          <button className="pg-btn" disabled={page <= 1} onClick={() => goPage(page - 1)}>
            Trước
          </button>
          <span className="adm-note">
            Trang {page}/{totalPages}
          </span>
          <button className="pg-btn" disabled={page >= totalPages} onClick={() => goPage(page + 1)}>
            Sau
          </button>
        </nav>
      )}
    </PageShell>
  )
}
