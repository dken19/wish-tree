'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import PageShell from '@/components/ui/PageShell'
import Icon from '@/components/ui/Icon'
import { THEMES, isThemeKey } from '@/lib/themes'
import { isFirebaseConfigured } from '@/lib/firebase.client'
import { SEED_WISHES } from '@/lib/wishes'
import { getIdToken, signInGoogle, signOutUser, watchAuth, type AuthUser } from '@/lib/auth'
import { PROGRESS_LABEL, formatNo, splitWishTime, type WishProgress } from '@/lib/wishMeta'

type Item = {
  id: string
  no: number | null
  text: string
  theme: string
  status: string
  flagged: boolean
  progress: WishProgress
  achievedAt: number
  commentCount: number
  createdAt: number
}

type Filter = 'all' | WishProgress

/** Trạng thái DUYỆT (do admin/hệ thống) — khác tiến độ (do chính người viết). */
function reviewLabel(it: Item): string {
  if (it.flagged) return 'Tạm ẩn, đang xem lại'
  switch (it.status) {
    case 'approved':
      return 'Đang treo trên cây'
    case 'pending':
      return 'Chờ duyệt'
    case 'funny':
      return 'Ở Góc xàm xí'
    case 'rejected':
      return 'Không lên cây'
    default:
      return it.status
  }
}

const PROGRESS_KEYS: WishProgress[] = ['trying', 'achieved']

// Bản dev chưa có Firebase: xem thử giao diện bằng điều ước mẫu, đổi tiến độ chỉ trong bộ nhớ (prod không bao giờ vào nhánh này).
const DEMO = !isFirebaseConfigured && process.env.NODE_ENV !== 'production'
const DEMO_STATUS = ['approved', 'approved', 'pending', 'approved', 'funny', 'rejected', 'approved', 'approved']
// mốc thời gian CỐ ĐỊNH (không Date.now) -> HTML server và client khớp nhau khi hydrate
const DEMO_T0 = Date.UTC(2026, 10, 24, 7)
const demoItems = (): Item[] =>
  SEED_WISHES.map((w, i) => ({
    id: w.id,
    no: w.no ?? null,
    text: w.text,
    theme: w.theme,
    status: DEMO_STATUS[i % DEMO_STATUS.length],
    flagged: false,
    progress: w.achieved ? 'achieved' : 'trying',
    achievedAt: w.achieved ? DEMO_T0 - 86400_000 : 0,
    commentCount: i === 0 ? 2 : 0,
    createdAt: DEMO_T0 - i * 26 * 3600_000,
  }))
const DEMO_USER: AuthUser = { uid: 'demo', name: 'Người thử nghiệm', photo: null }

export default function AccountView() {
  const [user, setUser] = useState<AuthUser | null>(DEMO ? DEMO_USER : null)
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured)
  const [items, setItems] = useState<Item[] | null>(DEMO ? demoItems : null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  const load = useCallback(async () => {
    setError('')
    try {
      const token = await getIdToken()
      if (!token) return
      const r = await fetch('/api/me/wishes', { headers: { Authorization: `Bearer ${token}` } })
      const body = await r.json().catch(() => ({}))
      if (r.ok && Array.isArray(body.items)) setItems(body.items as Item[])
      else setError(body?.error ?? 'Không tải được điều ước của bạn, thử lại nhé')
    } catch {
      setError('Không tải được điều ước của bạn, thử lại nhé')
    }
  }, [])

  // Đăng nhập/đổi tài khoản -> tải lại danh sách (trong callback, không setState đồng bộ ở effect)
  useEffect(() => {
    if (DEMO) return
    return watchAuth((u) => {
      setUser(u)
      setAuthReady(true)
      setItems(null)
      if (u) load()
    })
  }, [load])

  const setProgress = async (it: Item, progress: WishProgress) => {
    if (it.progress === progress || busy) return
    if (DEMO) {
      setItems((l) => l?.map((x) => (x.id === it.id ? { ...x, progress, achievedAt: progress === 'achieved' ? Date.now() : 0 } : x)) ?? l)
      return
    }
    setBusy(it.id)
    setError('')
    const prev = items
    // lạc quan: đổi ngay, lỗi thì trả lại
    setItems((l) =>
      l?.map((x) =>
        x.id === it.id ? { ...x, progress, achievedAt: progress === 'achieved' ? Date.now() : 0 } : x
      ) ?? l
    )
    try {
      const token = await getIdToken()
      const r = await fetch('/api/me/wishes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: it.id, progress }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        setItems(prev)
        setError(body?.error ?? 'Chưa lưu được, thử lại nhé')
      }
    } catch {
      setItems(prev)
      setError('Chưa lưu được, thử lại nhé')
    } finally {
      setBusy(null)
    }
  }

  const counts = useMemo(() => {
    const l = items ?? []
    const achieved = l.filter((x) => x.progress === 'achieved').length
    return { all: l.length, achieved, trying: l.length - achieved }
  }, [items])
  const shown = (items ?? []).filter((x) => filter === 'all' || x.progress === filter)

  return (
    <PageShell
      title="Điều ước của tôi"
      lead="Những điều ước bạn đã treo khi đăng nhập. Đánh dấu điều nào đang cố gắng, điều nào đã đạt được."
      stats={
        user &&
        items && (
          <dl className="pg-stats">
            <div>
              <dt>điều ước đã viết</dt>
              <dd>{counts.all.toLocaleString('vi-VN')}</dd>
            </div>
            <div>
              <dt>đang cố gắng</dt>
              <dd>{counts.trying.toLocaleString('vi-VN')}</dd>
            </div>
            <div>
              <dt>đã đạt được</dt>
              <dd>{counts.achieved.toLocaleString('vi-VN')}</dd>
            </div>
          </dl>
        )
      }
    >
      {!isFirebaseConfigured && !DEMO && (
        <p className="pg-status">Trang này cần cấu hình đăng nhập (Firebase) mới dùng được.</p>
      )}

      {isFirebaseConfigured && !authReady && <p className="pg-status">Đang kiểm tra đăng nhập…</p>}

      {isFirebaseConfigured && authReady && !user && (
        <div className="acc-login">
          <p>
            Đăng nhập để xem lại mọi điều ước bạn đã treo và đánh dấu điều nào đã thành sự thật. Điều ước gửi ẩn
            danh không gắn với tài khoản nên sẽ không hiện ở đây.
          </p>
          <button
            className="pg-btn primary"
            onClick={() =>
              signInGoogle().catch((e) => {
                const code = (e as { code?: string })?.code
                if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request')
                  setError('Chưa đăng nhập được, thử lại nhé')
              })
            }
          >
            Tiếp tục với Google
          </button>
        </div>
      )}

      {user && (
        <div className="adm-user acc-user">
          <span className="acc-who">
            {user.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photo} alt="" width={36} height={36} referrerPolicy="no-referrer" />
            )}
            <span>
              Đang đăng nhập: <b>{user.name}</b>
            </span>
          </span>
          <button className="pg-btn ghost" disabled={DEMO} onClick={() => signOutUser()}>
            <Icon name="logout" size={16} />
            Đăng xuất
          </button>
        </div>
      )}

      {error && <p className="pg-status err">{error}</p>}

      {user && !items && !error && <p className="pg-status">Đang tải điều ước của bạn…</p>}

      {user && items && items.length === 0 && (
        <div className="pg-status">
          <p>Bạn chưa treo điều ước nào khi đăng nhập.</p>
          <Link href="/" className="pg-btn primary">
            <Icon name="pen" size={16} />
            Ra cây viết điều ước
          </Link>
        </div>
      )}

      {user && items && items.length > 0 && (
        <>
          <div className="pg-chips" role="group" aria-label="Lọc theo tiến độ">
            <button className="pg-chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
              Tất cả · {counts.all}
            </button>
            {PROGRESS_KEYS.map((k) => (
              <button key={k} className="pg-chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>
                {PROGRESS_LABEL[k]} · {counts[k]}
              </button>
            ))}
          </div>

          {shown.length === 0 && (
            <p className="pg-status">
              {filter === 'achieved'
                ? 'Chưa có điều ước nào được đánh dấu đã đạt được. Cố lên nhé!'
                : 'Không còn điều ước nào đang cố gắng.'}
            </p>
          )}

          <ol className="wl">
            {shown.map((w) => {
              const tk = isThemeKey(w.theme) ? w.theme : null
              const [day, time] = splitWishTime(w.createdAt)
              const done = w.progress === 'achieved'
              const live = w.status === 'approved' && !w.flagged
              return (
                <li
                  key={w.id}
                  className={`tk acc-tk${done ? ' is-done' : ''}`}
                  style={{ '--tk-c': tk ? THEMES[tk].color : undefined } as React.CSSProperties}
                >
                  <div className="tk-stub">
                    {w.no ? <span className="tk-no acc-no">{formatNo(w.no)}</span> : null}
                    {day && (
                      <time className="tk-date" dateTime={new Date(w.createdAt).toISOString()}>
                        {day}
                        <br />
                        {time}
                      </time>
                    )}
                    {done && <span className="tk-stamp tk-done">Đã đạt</span>}
                  </div>
                  <div className="tk-body">
                    <p className="tk-text">{w.text}</p>
                    <div className="tk-meta">
                      <span className="tk-theme">
                        <i className="pg-dot" style={{ background: tk ? THEMES[tk].color : undefined }} />
                        {tk ? THEMES[tk].label : w.theme}
                      </span>
                      <span className={`acc-review s-${w.flagged ? 'flagged' : w.status}`}>{reviewLabel(w)}</span>
                      {done && w.achievedAt > 0 && (
                        <span>Đạt được ngày {splitWishTime(w.achievedAt)[0]}</span>
                      )}
                    </div>
                    <div className="acc-progress" role="group" aria-label={`Tiến độ điều ước ${formatNo(w.no)}`}>
                      {PROGRESS_KEYS.map((k) => (
                        <button
                          key={k}
                          className={`acc-seg s-${k}`}
                          aria-pressed={w.progress === k}
                          disabled={busy === w.id}
                          onClick={() => setProgress(w, k)}
                        >
                          <Icon name={k === 'achieved' ? 'check' : 'hourglass'} size={15} />
                          {PROGRESS_LABEL[k]}
                        </button>
                      ))}
                    </div>
                    {live && w.no && (
                      <div className="tk-actions">
                        <Link className="pg-act" href={`/dieu-uoc?q=%23${w.no}`}>
                          <Icon name="comment" size={16} />
                          {w.commentCount > 0 ? `${w.commentCount} bình luận` : 'Xem trên trang chung'}
                        </Link>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
          <p className="acc-hint">
            Dấu “Đã đạt được” cũng hiện công khai trên tờ ước ở cây và trang Tất cả điều ước, để mọi người cùng
            mừng với bạn.
          </p>
        </>
      )}
    </PageShell>
  )
}
