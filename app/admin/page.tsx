'use client'
import { useCallback, useEffect, useState } from 'react'
import PageShell from '@/components/ui/PageShell'
import Icon from '@/components/ui/Icon'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { THEMES, isThemeKey } from '@/lib/themes'
import { getAuthClient } from '@/lib/firebase.client'
import { signInGoogle, signOutUser } from '@/lib/auth'
import ReportsPanel from './ReportsPanel'

type Status = 'pending' | 'approved' | 'rejected' | 'funny' | 'all'
type Action = 'approve' | 'reject' | 'pending' | 'funny'

type Item = {
  id: string
  no: number | null
  text: string
  theme: string
  author: string | null
  status: string
  loggedIn: boolean
  flagged: boolean
  reportCount: number
  commentCount: number
  reviewedBy: string | null
  funnyNote: string
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
  { key: 'funny', label: 'Xàm xí' },
  { key: 'all', label: 'Tất cả' },
]

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  pending: { text: 'Chờ duyệt', color: '#c98a1b' },
  approved: { text: 'Đã duyệt', color: '#3f9d6b' },
  rejected: { text: 'Đã bỏ', color: '#9a8472' },
  funny: { text: 'Xàm xí', color: '#b5652a' },
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


export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [tab, setTab] = useState<Status>('pending')
  const [showReports, setShowReports] = useState(false)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  // đang ghi lí do "xàm xí" cho điều ước nào (id) + nội dung ô nhập
  const [noteFor, setNoteFor] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')

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
    if (!user || showReports) return
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
  }, [user, call, tab, page, showReports])

  useEffect(() => {
    load()
  }, [load])

  async function act(id: string, action: Action, note?: string) {
    setBusy(id)
    try {
      const r = await call('/api/admin/wishes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, note }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        setError(body.error ?? 'Không cập nhật được')
        return
      }
      setNoteFor(null)
      await load()
    } finally {
      setBusy(null)
    }
  }

  // Dùng chung khung trang nội dung (PageShell: trời đèn trời theo giờ VN, khung cuộn riêng)
  const shell = (children: React.ReactNode) => (
    <PageShell title="Quản trị điều ước" plainTitle>
      {children}
    </PageShell>
  )

  if (!authReady) return shell(<p className="pg-status">Đang kiểm tra đăng nhập…</p>)

  if (!user)
    return shell(
      <>
        <p className="adm-note">Đăng nhập bằng tài khoản Google quản trị để vào.</p>
        <button
          className="pg-btn primary"
          onClick={() => signInGoogle().catch((e) => setError(String(e?.message ?? e)))}
        >
          Đăng nhập với Google
        </button>
        {error && <p className="pg-status err">{error}</p>}
      </>
    )

  const counts = data?.counts
  const totalPages = data?.totalPages ?? 1

  return shell(
    <>
      <div className="adm-user">
        <span>
          Đang đăng nhập: <b>{user.email}</b>
        </span>
        <button className="pg-btn ghost" onClick={() => signOutUser()}>
          <Icon name="logout" size={16} />
          Đăng xuất
        </button>
      </div>

      <div className="pg-chips adm-tabs" role="group" aria-label="Lọc theo trạng thái">
        {TABS.map((t) => (
          <button
            key={t.key}
            className="pg-chip"
            aria-pressed={!showReports && t.key === tab}
            onClick={() => {
              setShowReports(false)
              setTab(t.key)
              setPage(1)
            }}
          >
            {t.label}
            {counts && <span className="adm-n">{counts[t.key].toLocaleString('vi-VN')}</span>}
          </button>
        ))}
        <button className="pg-chip" aria-pressed={showReports} onClick={() => setShowReports(true)}>
          <Icon name="flag" size={15} />
          Bị báo cáo
        </button>
        <button className="pg-chip" onClick={load} disabled={loading}>
          <Icon name="refresh" size={15} />
          {loading ? 'Đang tải…' : 'Tải lại'}
        </button>
      </div>

      {showReports && <ReportsPanel call={call} />}
      {!showReports && error && <p className="pg-status err">{error}</p>}
      {!showReports && !error && !loading && data && data.items.length === 0 && (
        <p className="pg-status">Không có điều ước nào ở mục này.</p>
      )}

      {!showReports && (
        <ol className="wl">
          {data?.items.map((it) => {
            const st = STATUS_LABEL[it.status]
            const tk = isThemeKey(it.theme) ? it.theme : null
            return (
              <li
                key={it.id}
                className="tk"
                style={
                  {
                    '--tk-c': tk ? THEMES[tk].color : undefined,
                    opacity: busy === it.id ? 0.5 : 1,
                  } as React.CSSProperties
                }
              >
                <div className="tk-stub">
                  {it.no ? <span className="tk-no">#{it.no}</span> : null}
                  <span className="tk-date">{fmt(it.createdAt)}</span>
                  {st && <span className="tk-stamp">{st.text}</span>}
                </div>
                <div className="tk-body">
                  <p className="tk-text">{it.text}</p>
                  <div className="tk-meta">
                    <span className="tk-theme">
                      <i className="pg-dot" style={{ background: tk ? THEMES[tk].color : undefined }} />
                      {tk ? THEMES[tk].label : it.theme}
                    </span>
                    <span>{it.author ?? 'Ẩn danh'}</span>
                    {it.loggedIn && <span>Đăng nhập, tự duyệt</span>}
                    {it.flagged && <span className="adm-warn">Tự ẩn do bị báo cáo</span>}
                    {it.reportCount > 0 && !it.flagged && (
                      <span className="adm-warn">{it.reportCount} báo cáo</span>
                    )}
                    {it.commentCount > 0 && <span>{it.commentCount} bình luận</span>}
                  </div>
                  {it.status === 'funny' && it.funnyNote && noteFor !== it.id && (
                    <p className="adm-funny">
                      <b>Lí do không duyệt:</b> {it.funnyNote}
                    </p>
                  )}
                  <div className="tk-meta">
                    {it.reviewedAt ? (
                      <span>
                        Xử lý {fmt(it.reviewedAt)}
                        {it.reviewedBy && it.reviewedBy !== 'secret' ? ` bởi ${it.reviewedBy}` : ''}
                      </span>
                    ) : null}
                  </div>
                  <div className="adm-acts">
                    {it.status !== 'approved' && (
                      <button className="pg-btn primary" disabled={!!busy} onClick={() => act(it.id, 'approve')}>
                        <Icon name="check" size={16} />
                        Duyệt
                      </button>
                    )}
                    {it.status !== 'rejected' && (
                      <button className="pg-btn ghost" disabled={!!busy} onClick={() => act(it.id, 'reject')}>
                        {it.status === 'approved' ? 'Gỡ khỏi cây' : 'Bỏ'}
                      </button>
                    )}
                    {it.status !== 'pending' && (
                      <button className="pg-btn ghost" disabled={!!busy} onClick={() => act(it.id, 'pending')}>
                        Đưa về chờ duyệt
                      </button>
                    )}
                    {noteFor !== it.id && (
                      <button
                        className="pg-btn ghost"
                        disabled={!!busy}
                        onClick={() => {
                          setNoteFor(it.id)
                          setNoteText(it.funnyNote)
                        }}
                      >
                        <Icon name="smile" size={16} />
                        {it.status === 'funny' ? 'Sửa lí do' : 'Xàm xí…'}
                      </button>
                    )}
                  </div>
                  {noteFor === it.id && (
                    <form
                      className="adm-funny-form"
                      onSubmit={(e) => {
                        e.preventDefault()
                        if (noteText.trim()) act(it.id, 'funny', noteText)
                      }}
                    >
                      <label htmlFor={`fn-${it.id}`}>
                        Lí do không duyệt (hiện công khai ở trang Góc xàm xí, không kèm tên người viết)
                      </label>
                      <textarea
                        id={`fn-${it.id}`}
                        rows={2}
                        maxLength={300}
                        value={noteText}
                        autoFocus
                        placeholder="VD: Ước thế này thì ông Bụt cũng phải xin nghỉ phép."
                        onChange={(e) => setNoteText(e.target.value)}
                      />
                      <div className="adm-acts">
                        <button className="pg-btn primary" disabled={!!busy || !noteText.trim()}>
                          Lưu vào Góc xàm xí
                        </button>
                        <button type="button" className="pg-btn ghost" onClick={() => setNoteFor(null)}>
                          Huỷ
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {!showReports && totalPages > 1 && (
        <nav className="pg-pager" aria-label="Phân trang">
          <button className="pg-btn ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <Icon name="back" size={16} />
            Trước
          </button>
          <span className="adm-note">
            Trang {page}/{totalPages}, {data?.total} điều ước
          </span>
          <button className="pg-btn ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Sau
          </button>
        </nav>
      )}
    </>
  )
}
