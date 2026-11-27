'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AuthBridge from '@/components/AuthBridge'
import { PageSky } from '@/components/ui/PageShell'
import Icon from '@/components/ui/Icon'
import Sparkles from '@/components/ui/Sparkles'
import WishPhoto from '@/components/ui/WishPhoto'
import WishFrame from '@/components/ui/WishFrame'
import { DEFAULT_FRAME, WISH_FRAMES, WISH_FRAME_KEYS, isWishFrame, type WishFrameKey } from '@/lib/wishFrames'
import WishThread, { ReportButton } from '@/components/ui/WishThread'
import Reactions, { useMyReactions } from '@/components/ui/Reactions'
import { useScene } from '@/store/useScene'
import { getIdToken } from '@/lib/auth'
import { isFirebaseConfigured } from '@/lib/firebase.client'
import { THEMES, isThemeKey } from '@/lib/themes'
import { PROGRESS_LABEL, formatNo, formatWishTime, privateWishPath, type WishProgress, type WishVisibility } from '@/lib/wishMeta'
import {
  DEFAULT_SKIN,
  PLAIN_SKIN,
  WISH_SKINS,
  WISH_SKIN_KEYS,
  isWishSkin,
  skinVars,
  type WishSkinKey,
} from '@/lib/wishSkins'
import type { PublicWish } from '@/lib/wishServer'

// Bản dev chưa có Firebase: ai cũng "xem thử" đổi giao diện của tờ mẫu có tên (chỉ trong bộ nhớ).
const DEMO = !isFirebaseConfigured && process.env.NODE_ENV !== 'production'

type Own = { progress: WishProgress; skin: WishSkinKey | null; visibility: WishVisibility }

/** `privateKey`: đang xem qua link bí mật của ước RIÊNG TƯ (/dieu-uoc/rieng/<key>). */
export default function WishDetail({ wish, privateKey }: { wish: PublicWish; privateKey?: string }) {
  const router = useRouter()
  const isPrivate = !!privateKey
  const user = useScene((s) => s.user)
  const showToast = useScene((s) => s.showToast)
  const verified = wish.verified
  const isSeed = wish.id.startsWith('seed-')

  // chủ nhân điều ước? (server xác nhận qua /api/me/wishes?id=) -> hiện bảng chỉnh
  const [own, setOwn] = useState<Own | null>(DEMO && verified ? { progress: wish.achieved ? 'achieved' : 'trying', skin: null, visibility: isPrivate ? 'private' : 'public' } : null)
  const [skin, setSkin] = useState<WishSkinKey>(isWishSkin(wish.skin) ? wish.skin : DEFAULT_SKIN)
  const [frame, setFrame] = useState<WishFrameKey>(isWishFrame(wish.frame) ? wish.frame : DEFAULT_FRAME)
  const [achieved, setAchieved] = useState(wish.achieved)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [canShare, setCanShare] = useState(false)
  const [comments, setComments] = useState(wish.commentCount)
  const [threadOpen, setThreadOpen] = useState(true)
  const [myRx, setMyRx] = useMyReactions([wish.id])

  useEffect(() => {
    // navigator.share chỉ có ở client (chủ yếu mobile) -> quyết định sau khi mount
    const id = requestAnimationFrame(() => setCanShare(typeof navigator !== 'undefined' && !!navigator.share))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    if (DEMO || !user || !verified || isSeed) return
    let alive = true
    getIdToken()
      .then((token) =>
        token ? fetch(`/api/me/wishes?id=${encodeURIComponent(wish.id)}`, { headers: { Authorization: `Bearer ${token}` } }) : null
      )
      .then((r) => (r && r.ok ? r.json() : null))
      .then((j) => {
        const it = j?.items?.[0]
        if (!alive) return
        setOwn(
          it
            ? {
                progress: it.progress === 'achieved' ? 'achieved' : 'trying',
                skin: isWishSkin(it.skin) ? it.skin : null,
                visibility: it.visibility === 'private' ? 'private' : 'public',
              }
            : null
        )
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [user, verified, isSeed, wish.id])
  const isOwner = !!own && (DEMO || !!user)

  const save = async (patch: { skin?: WishSkinKey; frame?: WishFrameKey; progress?: WishProgress; visibility?: WishVisibility }) => {
    if (DEMO) return {}
    setBusy(true)
    try {
      const token = await getIdToken()
      const r = await fetch('/api/me/wishes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: wish.id, ...patch }),
      })
      if (!r.ok) {
        const b = await r.json().catch(() => ({}))
        showToast(b?.error ?? 'Chưa lưu được, thử lại nhé')
        return null
      }
      return ((await r.json().catch(() => ({}))) ?? {}) as { privateUrl?: string | null }
    } catch {
      showToast('Chưa lưu được, thử lại nhé')
      return null
    } finally {
      setBusy(false)
    }
  }

  const pickSkin = async (k: WishSkinKey) => {
    if (k === skin || busy) return
    const prev = skin
    setSkin(k)
    if (!(await save({ skin: k }))) setSkin(prev)
  }
  const pickFrame = async (k: WishFrameKey) => {
    if (k === frame || busy) return
    const prev = frame
    setFrame(k)
    if (!(await save({ frame: k }))) setFrame(prev)
  }
  const pickProgress = async (p: WishProgress) => {
    if (busy || (p === 'achieved') === achieved) return
    const prev = achieved
    setAchieved(p === 'achieved')
    if (!(await save({ progress: p }))) setAchieved(prev)
  }

  // Đổi công khai <-> riêng tư: chuyển sang đúng địa chỉ mới (link #số không mở được ước riêng tư và ngược lại)
  const pickVisibility = async (v: WishVisibility) => {
    if (busy || !own || own.visibility === v) return
    if (DEMO) {
      setOwn({ ...own, visibility: v })
      return
    }
    const res = await save({ visibility: v })
    if (!res) return
    setOwn({ ...own, visibility: v })
    if (v === 'private' && res.privateUrl) {
      showToast('Đã chuyển riêng tư. Chỉ ai có link mới xem được.')
      router.replace(res.privateUrl)
    } else if (v === 'public') {
      showToast('Đã công khai, điều ước lên lại cây.')
      router.replace(`/dieu-uoc/${wish.no}`)
    }
  }

  const sharePath = privateKey ? privateWishPath(privateKey) : `/dieu-uoc/${wish.no}`
  const shareUrl = () => `${window.location.origin}${sharePath}`
  const copy = async () => {
    const url = shareUrl()
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // trình duyệt cũ / không cấp quyền: chép bằng ô ẩn
      const ta = document.createElement('textarea')
      ta.value = url
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }
  const nativeShare = () =>
    navigator
      .share({ title: `Điều ước ${formatNo(wish.no)} · Cây Ước Nguyện`, text: `“${wish.text}”`, url: shareUrl() })
      .catch(() => {})

  const theme = isThemeKey(wish.theme) ? THEMES[wish.theme] : null
  const look = verified ? WISH_SKINS[skin] : PLAIN_SKIN
  const fbHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://cayuocnguyen.io.vn${sharePath}`)}`

  return (
    <div className={`pg wd${verified ? ' wd-fancy' : ' wd-plain'}`} style={skinVars(look) as React.CSSProperties} data-skin={verified ? skin : 'plain'}>
      <AuthBridge />
      {verified ? <div className="wd-bg" aria-hidden /> : <PageSky theme={wish.theme} />}

      <div className="pg-scroll wd-scroll">
        <nav className="wd-top">
          <Link href="/" className="wd-back">
            <Icon name="back" size={16} />
            Về cây ước nguyện
          </Link>
          <Link href="/dieu-uoc" className="wd-back">
            <Icon name="list" size={16} />
            Tất cả điều ước
          </Link>
        </nav>

        <article className={`wd-paper${verified ? ' is-verified' : ''}`}>
          {verified && <WishFrame frame={frame} />}
          <span className="wd-string" aria-hidden />
          {verified && <Sparkles key={skin} />}
          <header className="wd-head">
            <span className="wd-no">{formatNo(wish.no)}</span>
            {theme && (
              <span className="wd-tag" style={{ background: theme.color }}>
                {theme.label}
              </span>
            )}
            <span className="wd-seal" aria-hidden>
              Ước
            </span>
          </header>
          {isPrivate && (
            <span className="wd-private">
              <Icon name="lock" size={14} />
              Riêng tư · chỉ ai có link mới xem được
            </span>
          )}
          {wish.image && <WishPhoto image={wish.image} variant="detail" />}
          <p className="wd-text">“{wish.text}”</p>
          <footer className="wd-foot">
            <span className={verified && wish.author ? 'wd-author spk-name' : 'wd-author'}>
              {wish.author || 'Ẩn danh'}
            </span>
            {wish.createdAt > 0 && (
              <time dateTime={new Date(wish.createdAt).toISOString()}>{formatWishTime(wish.createdAt)}</time>
            )}
          </footer>
          {achieved && (
            <span className="wd-done">
              <Icon name="check" size={16} />
              Đã đạt được
            </span>
          )}
        </article>

        <div className="wd-rx">
          <Reactions
            wishId={wish.id}
            counts={wish.reactions}
            mine={myRx[wish.id]}
            onMine={(m) => setMyRx((x) => ({ ...x, [wish.id]: m }))}
          />
        </div>

        <div className="wd-share" role="group" aria-label="Chia sẻ điều ước">
          <button className="wd-btn primary" onClick={copy} aria-live="polite">
            <Icon name={copied ? 'check' : 'link'} size={17} />
            {copied ? 'Đã chép link' : 'Sao chép link'}
          </button>
          {canShare && (
            <button className="wd-btn" onClick={nativeShare}>
              <Icon name="share" size={17} />
              Chia sẻ
            </button>
          )}
          <a className="wd-btn" href={fbHref} target="_blank" rel="noopener noreferrer">
            <Icon name="ext" size={16} />
            Facebook
          </a>
        </div>

        {isOwner && (
          <section className="wd-panel" aria-label="Chỉnh trang điều ước của bạn">
            <h2>
              Trang điều ước của bạn{DEMO && <small> · xem thử, không lưu</small>}
            </h2>
            <div className="wd-row">
              <span className="wd-label">Giao diện</span>
              <div className="wd-swatches" role="radiogroup" aria-label="Giao diện trang">
                {WISH_SKIN_KEYS.map((k) => (
                  <button
                    key={k}
                    role="radio"
                    aria-checked={k === skin}
                    className="wd-swatch"
                    disabled={busy}
                    onClick={() => pickSkin(k)}
                    title={WISH_SKINS[k].label}
                  >
                    <i style={{ background: WISH_SKINS[k].bg }} />
                    <span>{WISH_SKINS[k].label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="wd-row">
              <span className="wd-label">Khung</span>
              <div className="wd-swatches" role="radiogroup" aria-label="Khung tờ ước">
                {WISH_FRAME_KEYS.map((k) => (
                  <button
                    key={k}
                    role="radio"
                    aria-checked={k === frame}
                    className="wd-swatch wd-frame-opt"
                    disabled={busy}
                    onClick={() => pickFrame(k)}
                    title={WISH_FRAMES[k].hint}
                  >
                    <i className="wd-frame-mini" aria-hidden>
                      <WishFrame frame={k} />
                    </i>
                    <span>{WISH_FRAMES[k].label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="wd-row">
              <span className="wd-label">Hiển thị</span>
              <div className="acc-progress" role="group" aria-label="Chế độ hiển thị">
                {(['public', 'private'] as WishVisibility[]).map((k) => (
                  <button
                    key={k}
                    className={`acc-seg s-${k}`}
                    aria-pressed={own?.visibility === k}
                    disabled={busy}
                    onClick={() => pickVisibility(k)}
                  >
                    <Icon name={k === 'private' ? 'lock' : 'globe'} size={15} />
                    {k === 'private' ? 'Riêng tư' : 'Công khai'}
                  </button>
                ))}
              </div>
            </div>
            <div className="wd-row">
              <span className="wd-label">Tiến độ</span>
              <div className="acc-progress" role="group" aria-label="Tiến độ điều ước">
                {(['trying', 'achieved'] as WishProgress[]).map((k) => (
                  <button
                    key={k}
                    className={`acc-seg s-${k}`}
                    aria-pressed={(k === 'achieved') === achieved}
                    disabled={busy}
                    onClick={() => pickProgress(k)}
                  >
                    <Icon name={k === 'achieved' ? 'check' : 'hourglass'} size={15} />
                    {PROGRESS_LABEL[k]}
                  </button>
                ))}
              </div>
            </div>
            <p className="wd-note">
              {own?.visibility === 'private'
                ? 'Riêng tư: không treo trên cây, không hiện ở danh sách hay tìm kiếm. Chỉ ai có link trên mới mở được.'
                : 'Giao diện, khung và dấu “Đã đạt được” hiện cho mọi người mở link, kể cả ảnh xem trước khi gửi qua Zalo, Messenger.'}{' '}
              <Link href="/tai-khoan">Tất cả điều ước của tôi</Link>
            </p>
          </section>
        )}

        {!verified && (
          <p className="wd-cta">
            Điều ước của người đăng nhập có trang lấp lánh và tự chọn được giao diện.{' '}
            <Link href="/">Ra cây viết một điều ước</Link>
          </p>
        )}

        {!isSeed && (
          <section className="wd-comments">
            <div className="wd-comments-head">
              <button className="pg-act" onClick={() => setThreadOpen((v) => !v)} aria-expanded={threadOpen}>
                <Icon name="comment" size={16} />
                {comments > 0 ? `${comments} bình luận` : 'Bình luận'}
              </button>
              <ReportButton wishId={wish.id} />
            </div>
            {threadOpen && <WishThread wishId={wish.id} onCount={setComments} />}
          </section>
        )}
      </div>
    </div>
  )
}
