'use client'
import { useEffect, useState } from 'react'
import { REPORT_REASONS, isReportReason } from '@/lib/wishMeta'

type Item = {
  key: string
  wishId: string
  commentId: string | null
  count: number
  reasons: Record<string, number>
  reporters: string[]
  lastAt: number
  exists: boolean
  text: string
  author: string | null
  status: string
  wishNo: number | null
  wishText: string | null
}


const STATUS: Record<string, string> = {
  approved: 'đang hiện trên cây',
  pending: 'đã TỰ ẨN (đủ báo cáo) — chờ xử lý',
  rejected: 'đã gỡ',
  visible: 'đang hiện',
  hidden: 'đã ẩn',
}

// Tab "Bị báo cáo" của /admin: gộp báo cáo theo nội dung, Ẩn/gỡ hoặc Bỏ qua (khôi phục).
export default function ReportsPanel({
  call,
}: {
  call: (input: string, init?: RequestInit) => Promise<Response>
}) {
  const [items, setItems] = useState<Item[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const [nonce, setNonce] = useState(0)
  const load = () => setNonce((n) => n + 1)

  useEffect(() => {
    let alive = true
    call('/api/admin/reports')
      .then(async (r) => ({ ok: r.ok, b: await r.json().catch(() => ({})) }))
      .then(({ ok, b }) => {
        if (!alive) return
        if (!ok) return setError(b.error ?? 'Không tải được báo cáo')
        setError('')
        setItems(b.items as Item[])
      })
      .catch(() => alive && setError('Không tải được báo cáo'))
    return () => {
      alive = false
    }
  }, [call, nonce])

  async function act(it: Item, action: 'hide' | 'dismiss') {
    setBusy(it.key)
    try {
      const r = await call('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wishId: it.wishId, commentId: it.commentId, action }),
      })
      if (!r.ok) {
        const b = await r.json().catch(() => ({}))
        setError(b.error ?? 'Không cập nhật được')
      }
      load()
    } finally {
      setBusy(null)
    }
  }

  if (error) return <p className="pg-status err">{error}</p>
  if (!items) return <p className="pg-status">Đang tải…</p>
  if (!items.length) return <p className="pg-status">Không có báo cáo nào cần xử lý.</p>

  return (
    <ol className="wl">
      {items.map((it) => (
        <li
          key={it.key}
          className="tk"
          style={{ '--tk-c': '#c8102e', opacity: busy === it.key ? 0.5 : 1 } as React.CSSProperties}
        >
          <div className="tk-stub">
            {it.wishNo ? <span className="tk-no">#{it.wishNo}</span> : null}
            <span className="tk-date">
              {it.count} báo cáo
              <br />
              {it.commentId ? 'Bình luận' : 'Điều ước'}
            </span>
            <span className="tk-stamp">{STATUS[it.status] ?? it.status}</span>
          </div>
          <div className="tk-body">
            {!it.exists ? (
              <p className="adm-note">Nội dung đã bị xoá.</p>
            ) : (
              <>
                {it.wishText && <p className="adm-note">Trên điều ước: “{it.wishText}”</p>}
                <p className="tk-text">{it.text}</p>
              </>
            )}
            <div className="tk-meta">
              <span>{it.author ?? 'Ẩn danh'}</span>
              <span>
                Lý do:{' '}
                {Object.entries(it.reasons)
                  .map(([r, n]) => `${isReportReason(r) ? REPORT_REASONS[r] : r} (${n})`)
                  .join(', ')}
              </span>
              {it.reporters.length > 0 && <span>Báo bởi {it.reporters.join(', ')}</span>}
            </div>
            <div className="adm-acts">
              <button className="pg-btn primary" disabled={!!busy} onClick={() => act(it, 'hide')}>
                {it.commentId ? 'Ẩn bình luận' : 'Gỡ điều ước'}
              </button>
              <button className="pg-btn ghost" disabled={!!busy} onClick={() => act(it, 'dismiss')}>
                Bỏ qua, giữ lại
              </button>
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
