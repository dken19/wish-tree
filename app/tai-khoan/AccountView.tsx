'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import PageShell from '@/components/ui/PageShell'
import Icon from '@/components/ui/Icon'
import { THEMES, isThemeKey } from '@/lib/themes'
import { isFirebaseConfigured } from '@/lib/firebase.client'
import { SEED_WISHES } from '@/lib/wishes'
import { REACTIONS, type ReactionCounts } from '@/lib/reactions'
import ReactionIcon from '@/components/ui/ReactionIcon'
import { getIdToken, signInGoogle, watchAuth, type AuthUser } from '@/lib/auth'
import { PROGRESS_LABEL, formatNo, splitWishTime, type WishImage, type WishProgress, type WishVisibility } from '@/lib/wishMeta'
import ProfileCard from './ProfileCard'
import WishPhoto from '@/components/ui/WishPhoto'

type Item = {
  id: string
  no: number | null
  text: string
  theme: string
  status: string
  flagged: boolean
  image?: WishImage | null
  visibility?: WishVisibility
  privateUrl?: string | null
  progress: WishProgress
  achievedAt: number
  commentCount: number
  createdAt: number
  reactions?: ReactionCounts
}

type Filter = 'all' | WishProgress

/** Trạng thái DUYỆT (do admin/hệ thống) — khác tiến độ (do chính người viết). */
function reviewLabel(it: Item): string {
  if (it.flagged) return 'Tạm ẩn, đang xem lại'
  switch (it.status) {
    case 'approved':
      return 'Đang treo trên cây'
    case 'private':
      return 'Riêng tư · chỉ ai có link'
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
const DEMO_STATUS = ['approved', 'private', 'pending', 'approved', 'funny', 'rejected', 'approved', 'approved']
// mốc thời gian CỐ ĐỊNH (không Date.now) -> HTML server và client khớp nhau khi hydrate
const DEMO_T0 = Date.UTC(2026, 10, 24, 7)
const demoItems = (): Item[] =>
  SEED_WISHES.map((w, i) => ({
    id: w.id,
    no: w.no ?? null,
    text: w.text,
    theme: w.theme,
    status: DEMO_STATUS[i % DEMO_STATUS.length],
    visibility: DEMO_STATUS[i % DEMO_STATUS.length] === 'private' ? 'private' : 'public',
    privateUrl: DEMO_STATUS[i % DEMO_STATUS.length] === 'private' ? '/dieu-uoc/rieng/demo-key-xem-thu-000000' : null,
    flagged: false,
    progress: w.achieved ? 'achieved' : 'trying',
    achievedAt: w.achieved ? DEMO_T0 - 86400_000 : 0,
    commentCount: i === 0 ? 2 : 0,
    reactions: i === 0 ? { heart: 5, clover: 2 } : i === 3 ? { star: 3 } : {},
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
  const [copied, setCopied] = useState<string | null>(null)

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

  // Công khai <-> riêng tư (chỉ ước đang treo/riêng tư; server kiểm lại)
  const setVisibility = async (it: Item, visibility: WishVisibility) => {
    if (busy || (it.visibility ?? 'public') === visibility) return
    if (DEMO) {
      setItems((l) => l?.map((x) => (x.id === it.id ? { ...x, visibility, status: visibility === 'private' ? 'private' : 'approved', privateUrl: visibility === 'private' ? '/dieu-uoc/rieng/demo-key-xem-thu-000000' : null } : x)) ?? l)
      return
    }
    setBusy(it.id)
    setError('')
    try {
      const token = await getIdToken()
      const r = await fetch('/api/me/wishes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: it.id, visibility }),
      })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) {
        setError(body?.error ?? 'Chưa lưu được, thử lại nhé')
        return
      }
      setItems(
        (l) =>
          l?.map((x) =>
            x.id === it.id
              ? { ...x, visibility, status: visibility === 'private' ? 'private' : 'approved', privateUrl: body.privateUrl ?? null }
              : x
          ) ?? l
      )
    } catch {
      setError('Chưa lưu được, thử lại nhé')
    } finally {
      setBusy(null)
    }
  }

  const copyLink = async (it: Item) => {
    if (!it.privateUrl) return
    const url = `${window.location.origin}${it.privateUrl}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(it.id)
      setTimeout(() => setCopied((c) => (c === it.id ? null : c)), 2200)
    } catch {
      window.prompt('Chép link này để gửi:', url)
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

      {user && <ProfileCard key={user.uid} user={user} demo={DEMO} onChange={setUser} />}

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
              const priv = w.status === 'private' && !w.flagged
              const detailHref = priv ? w.privateUrl : live && w.no ? `/dieu-uoc/${w.no}` : null
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
                    {w.image && <WishPhoto image={w.image} variant="thumb" />}
                    <p className="tk-text">{w.text}</p>
                    <div className="tk-meta">
                      <span className="tk-theme">
                        <i className="pg-dot" style={{ background: tk ? THEMES[tk].color : undefined }} />
                        {tk ? THEMES[tk].label : w.theme}
                      </span>
                      <span className={`acc-review s-${w.flagged ? 'flagged' : w.status}`}>{reviewLabel(w)}</span>
                      {REACTIONS.some((r) => (w.reactions?.[r.key] ?? 0) > 0) && (
                        <span className="acc-rx" aria-label="Cảm xúc nhận được">
                          {REACTIONS.filter((r) => (w.reactions?.[r.key] ?? 0) > 0).map((r) => (
                            <span key={r.key} style={{ color: r.color }} title={r.label}>
                              <ReactionIcon kind={r.key} size={16} />
                              {w.reactions?.[r.key]}
                            </span>
                          ))}
                        </span>
                      )}
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
                    {(live || priv) && (
                      <div className="acc-progress" role="group" aria-label={`Ai xem được điều ước ${formatNo(w.no)}`}>
                        {(['public', 'private'] as WishVisibility[]).map((k) => (
                          <button
                            key={k}
                            className={`acc-seg s-${k}`}
                            aria-pressed={(priv ? 'private' : 'public') === k}
                            disabled={busy === w.id}
                            onClick={() => setVisibility(w, k)}
                          >
                            <Icon name={k === 'private' ? 'lock' : 'globe'} size={15} />
                            {k === 'private' ? 'Riêng tư' : 'Công khai'}
                          </button>
                        ))}
                      </div>
                    )}
                    {detailHref && (
                      <div className="tk-actions">
                        <Link className="pg-act" href={detailHref}>
                          <Icon name="ext" size={16} />
                          Trang điều ước · chọn giao diện
                        </Link>
                        {priv && (
                          <button className="pg-act" onClick={() => copyLink(w)} aria-live="polite">
                            <Icon name={copied === w.id ? 'check' : 'link'} size={16} />
                            {copied === w.id ? 'Đã chép link riêng' : 'Chép link riêng tư'}
                          </button>
                        )}
                        {w.commentCount > 0 && (
                          <Link className="pg-act" href={detailHref}>
                            <Icon name="comment" size={16} />
                            {w.commentCount} bình luận
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
          <p className="acc-hint">
            Dấu “Đã đạt được” cũng hiện công khai trên tờ ước ở cây và trang Tất cả điều ước, để mọi người cùng
            mừng với bạn. Điều ước <b>riêng tư</b> không treo trên cây, không hiện ở danh sách hay tìm kiếm: chỉ ai
            có link riêng mới mở được.
          </p>
        </>
      )}
    </PageShell>
  )
}
