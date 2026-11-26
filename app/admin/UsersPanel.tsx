'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'

// Tab "Người dùng" trong /admin: danh sách tài khoản đăng nhập (Firebase Auth) + số điều ước,
// tìm theo email/tên, xem điều ước của 1 người, Khoá / Mở khoá, Gỡ mọi điều ước đang treo (spam).

type User = {
  uid: string
  name: string
  email: string
  photo: string | null
  providers: string[]
  createdAt: number
  lastSignIn: number
  disabled: boolean
  admin: boolean
  wishCount: number
}
type Resp = {
  items: User[]
  total: number
  totalUsers: number
  banned: number
  page: number
  totalPages: number
}
type UWish = { id: string; no: number | null; text: string; status: string; flagged: boolean; createdAt: number }

const fmt = (ms: number) =>
  ms
    ? new Date(ms).toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

const STATUS: Record<string, string> = {
  approved: 'Đang treo',
  pending: 'Chờ duyệt',
  rejected: 'Đã bỏ',
  funny: 'Xàm xí',
}

export default function UsersPanel({ call }: { call: (input: string, init?: RequestInit) => Promise<Response> }) {
  const [q, setQ] = useState('')
  const [qInput, setQInput] = useState('')
  const [filter, setFilter] = useState<'all' | 'banned'>('all')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Resp | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [openUid, setOpenUid] = useState<string | null>(null)
  const [wishes, setWishes] = useState<Record<string, UWish[]>>({})
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    let alive = true
    const u = new URLSearchParams({ page: String(page), filter })
    if (q) u.set('q', q)
    call(`/api/admin/users?${u}`)
      .then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
      .then(({ ok, body }) => {
        if (!alive) return
        if (ok) {
          setData(body as Resp)
          setError('')
        } else setError(body.error ?? 'Không tải được danh sách người dùng')
      })
      .catch(() => alive && setError('Không tải được danh sách người dùng'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [call, q, filter, page, nonce])

  const toggleWishes = async (uid: string) => {
    if (openUid === uid) return setOpenUid(null)
    setOpenUid(uid)
    if (wishes[uid]) return
    const r = await call(`/api/admin/users?uid=${encodeURIComponent(uid)}`)
    const body = await r.json().catch(() => ({}))
    setWishes((w) => ({ ...w, [uid]: Array.isArray(body.wishes) ? body.wishes : [] }))
  }

  const act = async (u: User, action: 'ban' | 'unban' | 'hide-wishes') => {
    const ask =
      action === 'ban'
        ? `Khoá tài khoản ${u.email || u.name}? Người này sẽ không viết điều ước, bình luận, báo cáo hay thả cảm xúc được nữa.`
        : action === 'hide-wishes'
          ? `Gỡ mọi điều ước đang treo của ${u.email || u.name} khỏi cây?`
          : null
    if (ask && !window.confirm(ask)) return
    setBusy(u.uid)
    try {
      const r = await call('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: u.uid, action }),
      })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) setError(body.error ?? 'Không cập nhật được')
      else {
        setError('')
        if (action === 'hide-wishes') {
          // tải lại danh sách điều ước của người này ở lần mở sau
          setWishes((w) => Object.fromEntries(Object.entries(w).filter(([k]) => k !== u.uid)))
          setOpenUid(null)
        }
        reload()
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="adm-users">
      <form
        className="pg-search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          setLoading(true)
          setPage(1)
          setQ(qInput.trim())
        }}
      >
        <Icon name="search" />
        <input
          type="search"
          placeholder="Tìm theo email, tên hoặc uid"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          aria-label="Tìm người dùng"
        />
        <button type="submit" className="pg-btn primary">
          Tìm
        </button>
      </form>

      <div className="pg-chips" role="group" aria-label="Lọc người dùng">
        <button
          className="pg-chip"
          aria-pressed={filter === 'all'}
          onClick={() => {
            setLoading(true)
            setFilter('all')
            setPage(1)
          }}
        >
          Tất cả {data ? <span className="adm-n">{data.totalUsers.toLocaleString('vi-VN')}</span> : null}
        </button>
        <button
          className="pg-chip"
          aria-pressed={filter === 'banned'}
          onClick={() => {
            setLoading(true)
            setFilter('banned')
            setPage(1)
          }}
        >
          Đã khoá {data ? <span className="adm-n">{data.banned.toLocaleString('vi-VN')}</span> : null}
        </button>
      </div>

      {error && <p className="pg-status err">{error}</p>}
      {loading && !data && <p className="pg-status">Đang tải người dùng…</p>}
      {data && data.items.length === 0 && <p className="pg-status">Không có tài khoản nào khớp.</p>}

      <ul className="adm-ulist">
        {data?.items.map((u) => (
          <li key={u.uid} className={`adm-u${u.disabled ? ' is-banned' : ''}`} style={{ opacity: busy === u.uid ? 0.5 : 1 }}>
            <div className="adm-u-head">
              {u.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.photo} alt="" width={40} height={40} referrerPolicy="no-referrer" />
              ) : (
                <span className="adm-u-ph">
                  <Icon name="user" size={20} />
                </span>
              )}
              <div className="adm-u-id">
                <b>
                  {u.name || '(chưa có tên)'}
                  {u.admin && <span className="adm-badge">Quản trị</span>}
                  {u.disabled && <span className="adm-badge ban">Đã khoá</span>}
                </b>
                <span>{u.email || u.uid}</span>
              </div>
            </div>
            <div className="tk-meta">
              <span>Tham gia {fmt(u.createdAt)}</span>
              <span>Đăng nhập gần nhất {fmt(u.lastSignIn)}</span>
              <span>{u.wishCount} điều ước</span>
            </div>
            <div className="adm-acts">
              {u.wishCount > 0 && (
                <button className="pg-btn ghost" onClick={() => toggleWishes(u.uid)} aria-expanded={openUid === u.uid}>
                  <Icon name="list" size={16} />
                  {openUid === u.uid ? 'Ẩn điều ước' : 'Xem điều ước'}
                </button>
              )}
              {!u.admin &&
                (u.disabled ? (
                  <button className="pg-btn ghost" disabled={!!busy} onClick={() => act(u, 'unban')}>
                    Mở khoá
                  </button>
                ) : (
                  <button className="pg-btn ghost adm-danger" disabled={!!busy} onClick={() => act(u, 'ban')}>
                    Khoá tài khoản
                  </button>
                ))}
              {u.wishCount > 0 && !u.admin && (
                <button className="pg-btn ghost" disabled={!!busy} onClick={() => act(u, 'hide-wishes')}>
                  Gỡ mọi điều ước đang treo
                </button>
              )}
            </div>
            {openUid === u.uid && (
              <ol className="adm-uwishes">
                {!wishes[u.uid] && <li>Đang tải…</li>}
                {wishes[u.uid]?.map((w) => (
                  <li key={w.id}>
                    {w.no && w.status === 'approved' ? (
                      <Link href={`/dieu-uoc/${w.no}`}>#{w.no}</Link>
                    ) : (
                      <b>{w.no ? `#${w.no}` : '—'}</b>
                    )}{' '}
                    <span className="adm-uw-st">{w.flagged ? 'Tự ẩn (báo cáo)' : (STATUS[w.status] ?? w.status)}</span>{' '}
                    {w.text}
                  </li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ul>

      {data && data.totalPages > 1 && (
        <nav className="pg-pager" aria-label="Phân trang người dùng">
          <button className="pg-btn ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Trước
          </button>
          <span className="pg-gap">
            {page} / {data.totalPages}
          </span>
          <button className="pg-btn ghost" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
            Sau
          </button>
        </nav>
      )}
    </section>
  )
}
