'use client'
import { useEffect, useState } from 'react'
import { useScene } from '@/store/useScene'
import { getIdToken, signInGoogle } from '@/lib/auth'
import { isFirebaseConfigured } from '@/lib/firebase.client'
import { MAX_COMMENT_LEN, validateComment } from '@/lib/profanity'
import { REPORT_REASONS, formatWishTime, type ReportReason } from '@/lib/wishMeta'
import Icon from './Icon'

type Comment = {
  id: string
  text: string
  author: string
  photo: string | null
  createdAt: number
  mine: boolean
  /** bình luận của người giữ cây (admin) — server đặt */
  staff?: boolean
}

async function authed(input: string, init?: RequestInit) {
  const token = await getIdToken()
  return fetch(input, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

function LoginHint({ what }: { what: string }) {
  const [err, setErr] = useState('')
  if (!isFirebaseConfigured) return null
  return (
    <div className="wt-login">
      <span>Đăng nhập để {what}</span>
      <button
        className="auth-in g"
        onClick={() => signInGoogle().catch(() => setErr('Đăng nhập chưa thành công, thử lại nhé'))}
      >
        Google
      </button>
      {err && <span className="wt-err">{err}</span>}
    </div>
  )
}

/** Nút ⚑ Báo cáo -> chọn lý do -> POST /api/reports (chỉ người đăng nhập). */
export function ReportButton({
  wishId,
  commentId,
  label = 'Báo cáo',
}: {
  wishId: string
  commentId?: string
  label?: string
}) {
  const user = useScene((s) => s.user)
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function send(reason: ReportReason) {
    setBusy(true)
    try {
      const r = await authed('/api/reports', {
        method: 'POST',
        body: JSON.stringify({ wishId, commentId, reason }),
      })
      const b = await r.json().catch(() => ({}))
      if (!r.ok) setMsg(b.error ?? 'Không gửi được báo cáo')
      else {
        setMsg(b.duplicate ? 'Bạn đã báo cáo nội dung này rồi.' : 'Đã gửi báo cáo. Cảm ơn bạn.')
        setOpen(false)
      }
    } catch {
      setMsg('Mất kết nối, thử lại nhé')
    } finally {
      setBusy(false)
    }
  }

  if (msg && !open) return <span className="wt-note">{msg}</span>
  return (
    <span className="wt-report">
      <button className="wt-link" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Icon name="flag" size={16} />
        {label}
      </button>
      {open &&
        (user ? (
          <span className="wt-reasons">
            {(Object.keys(REPORT_REASONS) as ReportReason[]).map((k) => (
              <button key={k} disabled={busy} onClick={() => send(k)}>
                {REPORT_REASONS[k]}
              </button>
            ))}
            {msg && <span className="wt-err">{msg}</span>}
          </span>
        ) : (
          <LoginHint what="báo cáo" />
        ))}
    </span>
  )
}

/**
 * Bình luận của 1 điều ước: đọc (ai cũng được) + viết/báo cáo (chỉ người đăng nhập Google).
 * Dùng ở WishCard (trên cây) và /dieu-uoc. onCount: báo số bình luận hiện có cho thẻ cha.
 */
export default function WishThread({
  wishId,
  onCount,
}: {
  wishId: string
  onCount?: (n: number) => void
}) {
  const user = useScene((s) => s.user)
  const [items, setItems] = useState<Comment[] | null>(null)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [formErr, setFormErr] = useState('')

  // Tải bình luận (lại khi đổi tài khoản để cập nhật `mine`). setState chỉ trong callback async.
  useEffect(() => {
    let alive = true
    authed(`/api/wishes/${encodeURIComponent(wishId)}/comments`)
      .then(async (r) => ({ ok: r.ok, b: await r.json().catch(() => ({})) }))
      .then(({ ok, b }) => {
        if (!alive) return
        if (!ok) return setError(b.error ?? 'Không tải được bình luận')
        setError('')
        setItems(b.items as Comment[])
        onCount?.(b.items.length)
      })
      .catch(() => alive && setError('Không tải được bình luận'))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onCount chỉ để hiển thị số, không cần tải lại
  }, [wishId, user?.uid])

  async function send() {
    const v = validateComment(text)
    if (!v.ok) {
      setFormErr(v.reason)
      return
    }
    setSending(true)
    setFormErr('')
    try {
      const r = await authed(`/api/wishes/${encodeURIComponent(wishId)}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: text.trim() }),
      })
      const b = await r.json().catch(() => ({}))
      if (!r.ok) {
        setFormErr(b.error ?? 'Gửi không thành công, thử lại nhé')
        return
      }
      const next = [...(items ?? []), b.item as Comment]
      setItems(next)
      onCount?.(next.length)
      setText('')
    } catch {
      setFormErr('Mất kết nối, thử lại nhé')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="wish-thread">
      {error && <p className="wt-err">{error}</p>}
      {!items && !error && <p className="wt-note">Đang tải bình luận…</p>}
      {items && items.length === 0 && <p className="wt-note">Chưa có bình luận. Gửi lời chúc đầu tiên đi.</p>}
      {items && items.length > 0 && (
        <ul className="wt-list">
          {items.map((c) => (
            <li key={c.id} className={c.staff ? 'wt-staff' : undefined}>
              <div className="wt-head">
                {c.staff && (
                  <span className="wt-seal" aria-hidden="true">
                    <Icon name="tree" size={13} />
                  </span>
                )}
                {c.photo && (
                  // eslint-disable-next-line @next/next/no-img-element -- ảnh đại diện Google, nhỏ
                  <img src={c.photo} alt="" width={20} height={20} referrerPolicy="no-referrer" />
                )}
                <b>{c.author}</b>
                {c.staff && <span className="wt-badge">Giữ cây</span>}
                <span className="wt-time">{formatWishTime(c.createdAt)}</span>
              </div>
              <p>{c.text}</p>
              {!c.mine && <ReportButton wishId={wishId} commentId={c.id} />}
            </li>
          ))}
        </ul>
      )}

      {user ? (
        <div className="wt-form">
          <textarea
            maxLength={MAX_COMMENT_LEN}
            rows={2}
            placeholder={`Viết lời chúc, hiện với tên ${user.name}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="wt-form-row">
            {formErr ? <span className="wt-err">{formErr}</span> : <span />}
            <button className="wt-send" disabled={sending || !text.trim()} onClick={send}>
              {sending ? 'Đang gửi…' : 'Bình luận'}
            </button>
          </div>
        </div>
      ) : (
        <LoginHint what="bình luận" />
      )}
    </div>
  )
}
