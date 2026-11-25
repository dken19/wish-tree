'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { THEMES, isThemeKey } from '@/lib/themes'
import { formatNo, formatWishTime } from '@/lib/wishMeta'
import PageShell from '@/components/ui/PageShell'
import Icon from '@/components/ui/Icon'

type Item = {
  id: string
  no: number | null
  text: string
  theme: string
  /** lí do riêng (rỗng nếu tờ dùng lí do chung của bộ) */
  note: string
  createdAt: number
  group?: { title: string; note: string } | null
}
type Resp = { items: Item[]; page: number; total: number; totalPages: number }
type Coll = { id: string; title: string; note: string; wishes: Item[] }

function Ticket({ w, compact }: { w: Item; compact?: boolean }) {
  const tk = isThemeKey(w.theme) ? w.theme : null
  return (
    <li
      className={`tk fx${compact ? ' fx-c' : ''}`}
      style={{ '--tk-c': tk ? THEMES[tk].color : undefined } as React.CSSProperties}
    >
      <div className="tk-stub">
        {w.no ? <span className="tk-no">{formatNo(w.no)}</span> : null}
        <span className="tk-date">{formatWishTime(w.createdAt)}</span>
        {!compact && <span className="tk-stamp">Xàm xí</span>}
      </div>
      <div className="tk-body">
        <p className="tk-text">{w.text}</p>
        {w.note ? (
          <p className="fx-note">
            <span className="fx-note-k">
              <Icon name="smile" size={15} />
              Lí do không duyệt
            </span>
            {w.note}
          </p>
        ) : !compact && w.group?.note ? (
          <p className="fx-note">
            <span className="fx-note-k">
              <Icon name="smile" size={15} />
              Lí do chung của bộ “{w.group.title}”
            </span>
            {w.group.note}
          </p>
        ) : null}
        <div className="tk-meta">
          <span className="tk-theme">
            <i className="pg-dot" style={{ background: tk ? THEMES[tk].color : undefined }} />
            {tk ? THEMES[tk].label : w.theme}
          </span>
          {/* tên người viết luôn được giấu ở Góc xàm xí */}
          <span className="fx-anon">Ẩn danh</span>
        </div>
      </div>
    </li>
  )
}

/** Tab "Bộ sưu tập": các bộ 2–6 tờ liên quan nhau, mỗi bộ có tên + lời phê chung. */
function Collections() {
  const [items, setItems] = useState<Coll[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    fetch('/api/wishes/funny/collections')
      .then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
      .then(({ ok, body }) => {
        if (!alive) return
        if (ok && Array.isArray(body.items)) setItems(body.items)
        else setError(body?.error ?? 'Không tải được bộ sưu tập, thử lại nhé')
      })
      .catch(() => alive && setError('Không tải được bộ sưu tập, thử lại nhé'))
    return () => {
      alive = false
    }
  }, [])
  if (error) return <p className="pg-status err">{error}</p>
  if (!items) return <p className="pg-status">Đang mở hộp xàm xí…</p>
  if (!items.length) return <p className="pg-status">Chưa có bộ nào. Người giữ cây đang sưu tầm thêm.</p>
  return (
    <div className="fc-sets">
      {items.map((c) => (
        <section key={c.id} className="fc-set" aria-labelledby={`fc-${c.id}`}>
          <header>
            <span className="fc-count">Bộ {c.wishes.length} tờ</span>
            <h2 id={`fc-${c.id}`}>{c.title}</h2>
            {c.note && (
              <p className="fx-note">
                <span className="fx-note-k">
                  <Icon name="smile" size={15} />
                  Lí do không duyệt chung
                </span>
                {c.note}
              </p>
            )}
          </header>
          <ol className="wl">
            {c.wishes.map((w) => (
              <Ticket key={w.id} w={w} compact />
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}

// "Góc xàm xí": điều ước admin đánh dấu vui (status 'funny') + lí do không duyệt. Không hiện tên người viết.
export default function FunnyView() {
  const router = useRouter()
  const params = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const view: 'to' | 'bo' = params.get('view') === 'bo' ? 'bo' : 'to'
  const [data, setData] = useState<Resp | null>(null)
  // trang đã tải xong gần nhất -> "đang tải" = khác trang hiện tại (không setState đồng bộ trong effect)
  const [doneFor, setDoneFor] = useState(0)
  const [error, setError] = useState('')
  const loading = doneFor !== page

  useEffect(() => {
    if (view !== 'to') return
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
  }, [page, view])

  const goPage = (p: number) => router.push(p > 1 ? `/xam-xi?page=${p}` : '/xam-xi')
  const totalPages = data?.totalPages ?? 1

  return (
    <PageShell
      title="Góc xàm xí"
      stats={
        <p className="fx-lead">
          Những điều ước không được treo lên cây, nhưng đọc thì vui. Mỗi tờ (hoặc cả bộ) có kèm lời phê của người giữ cây.
          Tên người viết được giấu đi.
        </p>
      }
    >
      <div className="pg-chips fx-tabs" role="group" aria-label="Cách xem">
        <button className="pg-chip" aria-pressed={view === 'to'} onClick={() => router.push('/xam-xi')}>
          Từng tờ
        </button>
        <button className="pg-chip" aria-pressed={view === 'bo'} onClick={() => router.push('/xam-xi?view=bo')}>
          Bộ sưu tập
        </button>
      </div>

      {view === 'bo' ? (
        <Collections />
      ) : (
        <>
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
              {data.items.map((w) => (
                <Ticket key={w.id} w={w} />
              ))}
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
        </>
      )}
    </PageShell>
  )
}
