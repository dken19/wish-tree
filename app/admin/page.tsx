'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { THEMES, isThemeKey } from '@/lib/themes'
import { getAuthClient } from '@/lib/firebase.client'
import { signInGoogle, signOutUser } from '@/lib/auth'

type Status = 'pending' | 'approved' | 'rejected' | 'all'
type Action = 'approve' | 'reject' | 'pending'

type Item = {
  id: string
  text: string
  theme: string
  author: string | null
  status: string
  loggedIn: boolean
  reviewedBy: string | null
  createdAt: number
  reviewedAt: number
}

type Counts = Record<Status, number>

type Resp = {
  items: Item[]
  counts: Counts
  page: number
  total: number
  totalPages: number
}

const TABS: { key: Status; label: string }[] = [
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'approved', label: 'Đã duyệt' },
  { key: 'rejected', label: 'Đã bỏ' },
  { key: 'all', label: 'Tất cả' },
]

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  pending: { text: 'Chờ duyệt', color: '#c98a1b' },
  approved: { text: 'Đã duyệt', color: '#3f9d6b' },
  rejected: { text: 'Đã bỏ', color: '#9a8472' },
}

const fmt = (ms: number) =>
  ms
    ? new Date(ms).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

const btn = (bg: string, fg = '#fff', border = 'none') => ({
  padding: '7px 14px',
  borderRadius: 8,
  border,
  background: bg,
  color: fg,
  cursor: 'pointer',
  fontSize: 14,
})

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [tab, setTab] = useState<Status>('pending')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    const auth = getAuthClient()
    if (!auth) {
      setAuthReady(true)
      return
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthReady(true)
    })
  }, [])

  const call = useCallback(
    async (input: string, init?: RequestInit) => {
      const token = await user?.getIdToken()
      return fetch(input, {
        ...init,
        headers: {
          ...(init?.headers ?? {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
    },
    [user]
  )

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const r = await call(`/api/admin/wishes?status=${tab}&page=${page}`)
      const body = await r.json().catch(() => ({}))
      if (!r.ok) {
        setError(body.error ?? 'Không tải được danh sách')
        setData(null)
        return
      }
      setData(body as Resp)
    } catch {
      setError('Không tải được danh sách')
    } finally {
      setLoading(false)
    }
  }, [user, call, tab, page])

  useEffect(() => {
    load()
  }, [load])

  async function act(id: string, action: Action) {
    setBusy(id)
    try {
      const r = await call('/api/admin/wishes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        setError(body.error ?? 'Không cập nhật được')
        return
      }
      await load()
    } finally {
      setBusy(null)
    }
  }

  const shell = (children: React.ReactNode) => (
    <main
      style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: '32px 20px 60px',
        fontFamily: 'system-ui, sans-serif',
        color: '#3a2f2a',
      }}
    >
      <Link href="/" style={{ color: '#9a8472', fontSize: 14, textDecoration: 'none' }}>
        ← Về cây ước nguyện
      </Link>
      <h1 style={{ fontSize: 24, margin: '12px 0 4px' }}>Quản trị điều ước</h1>
      {children}
    </main>
  )

  if (!authReady) return shell(<p style={{ color: '#9a8472' }}>Đang kiểm tra đăng nhập…</p>)

  if (!user)
    return shell(
      <>
        <p style={{ color: '#9a8472', marginBottom: 20 }}>
          Đăng nhập bằng tài khoản Google quản trị để vào.
        </p>
        <button
          onClick={() => signInGoogle().catch((e) => setError(String(e?.message ?? e)))}
          style={btn('#c01730')}
        >
          Đăng nhập với Google
        </button>
        {error && <p style={{ color: '#c01730' }}>{error}</p>}
      </>
    )

  const counts = data?.counts
  const totalPages = data?.totalPages ?? 1

  return shell(
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          margin: '4px 0 20px',
          color: '#9a8472',
          fontSize: 14,
          flexWrap: 'wrap',
        }}
      >
        <span>
          Đang đăng nhập: <b style={{ color: '#3a2f2a' }}>{user.email}</b>
        </span>
        <button onClick={() => signOutUser()} style={btn('#fff', '#7a6557', '1px solid #d8ccbd')}>
          Đăng xuất
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {TABS.map((t) => {
          const on = t.key === tab
          return (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key)
                setPage(1)
              }}
              style={{
                ...btn(on ? '#c01730' : '#fbf4ea', on ? '#fff' : '#3a2f2a', '1px solid #e7ddcf'),
                borderRadius: 999,
                fontWeight: on ? 600 : 400,
              }}
            >
              {t.label}
              {counts ? ` (${counts[t.key]})` : ''}
            </button>
          )
        })}
        <button onClick={load} disabled={loading} style={btn('#fff', '#7a6557', '1px solid #d8ccbd')}>
          {loading ? 'Đang tải…' : '↻ Tải lại'}
        </button>
      </div>

      {error && <p style={{ color: '#c01730' }}>{error}</p>}
      {!error && !loading && data && data.items.length === 0 && (
        <p style={{ color: '#9a8472' }}>Không có điều ước nào ở mục này.</p>
      )}

      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 12 }}>
        {data?.items.map((it) => {
          const st = STATUS_LABEL[it.status]
          return (
            <li
              key={it.id}
              style={{
                border: '1px solid #e7ddcf',
                borderRadius: 14,
                padding: 16,
                background: '#fbf4ea',
                opacity: busy === it.id ? 0.5 : 1,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  alignItems: 'center',
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                <b style={{ color: isThemeKey(it.theme) ? THEMES[it.theme].color : '#9a8472' }}>
                  {isThemeKey(it.theme) ? THEMES[it.theme].label : it.theme}
                </b>
                {st && (
                  <span
                    style={{
                      color: '#fff',
                      background: st.color,
                      borderRadius: 999,
                      padding: '1px 8px',
                    }}
                  >
                    {st.text}
                  </span>
                )}
                {it.loggedIn && <span style={{ color: '#3f6f9d' }}>đăng nhập · tự duyệt</span>}
              </div>
              <p style={{ margin: '0 0 8px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{it.text}</p>
              <div style={{ fontSize: 12, color: '#9a8472', marginBottom: 12 }}>
                {it.author ? `${it.author} · ` : 'Ẩn danh · '}
                gửi {fmt(it.createdAt)}
                {it.reviewedAt ? ` · xử lý ${fmt(it.reviewedAt)}` : ''}
                {it.reviewedBy && it.reviewedBy !== 'secret' ? ` bởi ${it.reviewedBy}` : ''}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {it.status !== 'approved' && (
                  <button disabled={!!busy} onClick={() => act(it.id, 'approve')} style={btn('#3f9d6b')}>
                    Duyệt
                  </button>
                )}
                {it.status !== 'rejected' && (
                  <button
                    disabled={!!busy}
                    onClick={() => act(it.id, 'reject')}
                    style={btn('#fff', '#7a6557', '1px solid #d8ccbd')}
                  >
                    {it.status === 'approved' ? 'Gỡ khỏi cây' : 'Bỏ'}
                  </button>
                )}
                {it.status !== 'pending' && (
                  <button
                    disabled={!!busy}
                    onClick={() => act(it.id, 'pending')}
                    style={btn('#fff', '#7a6557', '1px solid #d8ccbd')}
                  >
                    Đưa về chờ duyệt
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {totalPages > 1 && (
        <nav style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 20 }}>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} style={btn('#fff', '#3a2f2a', '1px solid #d8ccbd')}>
            ‹ Trước
          </button>
          <span style={{ fontSize: 14, color: '#9a8472' }}>
            Trang {page}/{totalPages} · {data?.total} điều ước
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            style={btn('#fff', '#3a2f2a', '1px solid #d8ccbd')}
          >
            Sau ›
          </button>
        </nav>
      )}
    </>
  )
}
