'use client'
import { useCallback, useEffect, useState } from 'react'
import Icon from '@/components/ui/Icon'

type Pick = { id: string; no: number | null; text: string }
type Coll = { id: string; title: string; note: string; wishes: { id: string; no: number | null; text: string }[] }

const MIN = 2
const MAX = 6
const short = (t: string) => (t.length > 60 ? t.slice(0, 58) + '…' : t)

// Tab "Xàm xí" của /admin: gộp các tờ đã chọn thành "bộ" (tên + lời phê chung) + danh sách bộ đã tạo.
export default function FunnyCollectionsPanel({
  call,
  picked,
  onUnpick,
  onClear,
}: {
  call: (input: string, init?: RequestInit) => Promise<Response>
  picked: Pick[]
  onUnpick: (id: string) => void
  onClear: () => void
}) {
  const [items, setItems] = useState<Coll[] | null>(null)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const r = await call('/api/admin/funny-collections')
    const body = await r.json().catch(() => ({}))
    if (r.ok) setItems(body.items)
    else setError(body.error ?? 'Không tải được các bộ')
  }, [call])

  useEffect(() => {
    let alive = true
    call('/api/admin/funny-collections')
      .then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
      .then(({ ok, body }) => {
        if (!alive) return
        if (ok) setItems(body.items)
        else setError(body.error ?? 'Không tải được các bộ')
      })
      .catch(() => alive && setError('Không tải được các bộ'))
    return () => {
      alive = false
    }
  }, [call])

  async function send(method: 'POST' | 'DELETE', payload: object) {
    setBusy(true)
    setError('')
    try {
      const r = await call('/api/admin/funny-collections', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) {
        setError(body.error ?? 'Không lưu được')
        return false
      }
      await load()
      return true
    } finally {
      setBusy(false)
    }
  }

  const ready = picked.length >= MIN && picked.length <= MAX && title.trim().length > 0

  return (
    <section className="fc-admin" aria-label="Bộ xàm xí">
      <div className="fc-make">
        <h2>Gộp thành bộ</h2>
        {picked.length === 0 ? (
          <p className="adm-note">
            Tích ô “Chọn vào bộ” ở các tờ liên quan nhau bên dưới ({MIN}–{MAX} tờ, đẹp nhất là 3).
          </p>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!ready) return
              const ok = await send('POST', { title, note, wishIds: picked.map((p) => p.id) })
              if (ok) {
                setTitle('')
                setNote('')
                onClear()
              }
            }}
          >
            <ul className="fc-picked">
              {picked.map((p) => (
                <li key={p.id}>
                  <span>
                    {p.no ? <b>#{p.no}</b> : null} {short(p.text)}
                  </span>
                  <button type="button" className="fh-icon" aria-label="Bỏ khỏi bộ" onClick={() => onUnpick(p.id)}>
                    <Icon name="x" size={14} />
                  </button>
                </li>
              ))}
            </ul>
            {picked.length > MAX && <p className="adm-warn">Tối đa {MAX} tờ một bộ.</p>}
            <label htmlFor="fc-title">Tên bộ</label>
            <input
              id="fc-title"
              maxLength={80}
              value={title}
              placeholder="VD: Hội muốn giàu mà không muốn dậy sớm"
              onChange={(e) => setTitle(e.target.value)}
            />
            <label htmlFor="fc-note">Lời phê chung (không bắt buộc)</label>
            <textarea
              id="fc-note"
              rows={2}
              maxLength={300}
              value={note}
              placeholder="VD: Ba bạn này nên lập nhóm, cùng nhau ước cho tiết kiệm nến."
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="adm-acts">
              <button className="pg-btn primary" disabled={busy || !ready}>
                Tạo bộ ({picked.length} tờ)
              </button>
              <button type="button" className="pg-btn ghost" onClick={onClear}>
                Bỏ chọn
              </button>
            </div>
          </form>
        )}
        {error && <p className="pg-status err">{error}</p>}
      </div>

      {items && items.length > 0 && (
        <div className="fc-list">
          <h2>Các bộ đã tạo ({items.length})</h2>
          <ul>
            {items.map((c) => (
              <li key={c.id}>
                <div>
                  <b>{c.title}</b>
                  <span className="adm-note">
                    {' '}
                    · {c.wishes.length ? c.wishes.map((w) => (w.no ? `#${w.no}` : '?')).join(', ') : 'không còn tờ nào (đã ẩn khỏi trang)'}
                  </span>
                </div>
                <button
                  className="pg-btn ghost"
                  disabled={busy}
                  onClick={() => {
                    if (confirm(`Xoá bộ "${c.title}"? Các điều ước vẫn ở mục Xàm xí.`)) send('DELETE', { id: c.id })
                  }}
                >
                  Xoá bộ
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
