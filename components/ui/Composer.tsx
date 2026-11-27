'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { THEMES, THEME_KEYS, type ThemeKey } from '@/lib/themes'
import { MAX_WISH_LEN, validateWish } from '@/lib/profanity'
import { useScene } from '@/store/useScene'
import { isFirebaseConfigured } from '@/lib/firebase.client'
import { signInGoogle, signOutUser, getIdToken } from '@/lib/auth'
import Icon from './Icon'
import { shrinkImage } from '@/lib/imageResize'
import LacBird from './LacBird'

// Bản dev chưa có Firebase (.env.local) vẫn hiện CTA đăng nhập để xem giao diện; prod giữ nguyên.
const SHOW_AUTH = isFirebaseConfigured || process.env.NODE_ENV !== 'production'
// Bản dev chưa có Firebase: nút Google đăng nhập GIẢ (user mẫu trong store) để xem giao diện người đăng nhập
// (chọn ảnh, Công khai/Riêng tư). Gửi thật vẫn lỗi 503 vì server chưa cấu hình. Prod không bao giờ vào nhánh này.
const DEMO_LOGIN = !isFirebaseConfigured && process.env.NODE_ENV !== 'production'

// Bảng viết điều ước -> POST /api/wishes.
// Người đăng nhập Google (Facebook tạm ẩn — provider chưa bật trên Firebase): điều ước hiện NGAY; ẩn danh: vào hàng chờ duyệt.
export default function Composer() {
  const open = useScene((s) => s.composerOpen)
  const setOpen = useScene((s) => s.setComposerOpen)
  const showToast = useScene((s) => s.showToast)
  const user = useScene((s) => s.user)
  const setUser = useScene((s) => s.setUser)
  const stats = useScene((s) => s.stats)
  const bumpStats = useScene((s) => s.bumpStats)

  const [theme, setTheme] = useState<ThemeKey>('thi')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  // chỉ người đăng nhập: riêng tư = không lên cây, chỉ mở qua link bí mật
  const [priv, setPriv] = useState(false)
  const router = useRouter()
  const isPrivate = !!user && priv
  // 1 ảnh đính kèm (chỉ người đăng nhập): thu nhỏ ở client ngay khi chọn, server nén lại WebP
  const [img, setImg] = useState<{ blob: Blob; url: string } | null>(null)
  const [imgBusy, setImgBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const clearImg = () => {
    if (img) URL.revokeObjectURL(img.url)
    setImg(null)
    if (fileRef.current) fileRef.current.value = ''
  }
  async function pickImg(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('Chọn một file ảnh nhé')
      return
    }
    setImgBusy(true)
    try {
      const blob = await shrinkImage(file, { max: 1600 })
      if (blob.size > 4 * 1024 * 1024) {
        showToast('Ảnh lớn quá, chọn ảnh khác nhé')
        return
      }
      if (img) URL.revokeObjectURL(img.url)
      setImg({ blob, url: URL.createObjectURL(blob) })
    } finally {
      setImgBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function login() {
    if (DEMO_LOGIN) {
      setUser({ uid: 'demo', name: 'Người thử nghiệm', photo: null })
      showToast('Bản dev: đăng nhập giả để xem giao diện (chưa gửi thật được).')
      return
    }
    if (!isFirebaseConfigured) return
    try {
      await signInGoogle()
    } catch (e) {
      const code = (e as { code?: string })?.code ?? ''
      console.warn('[auth] signInGoogle failed:', code || e)
      // người dùng tự đóng popup → không làm phiền
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return
      showToast(
        code === 'auth/popup-blocked'
          ? 'Trình duyệt chặn cửa sổ đăng nhập — cho phép popup rồi thử lại nhé'
          : code === 'auth/unauthorized-domain'
            ? 'Tên miền này chưa được bật đăng nhập Google, mình đang sửa nhé'
            : code === 'auth/network-request-failed'
              ? 'Mạng chập chờn, thử lại nhé'
              : 'Đăng nhập chưa thành công, thử lại nhé',
      )
    }
  }

  async function send() {
    const v = validateWish(text)
    if (!v.ok) {
      showToast(v.reason)
      return
    }
    setSending(true)
    try {
      const token = user ? await getIdToken() : null
      const withImg = !!user && !!img
      let body: BodyInit
      if (withImg) {
        // multipart: KHÔNG tự đặt Content-Type (trình duyệt tự thêm boundary)
        const fd = new FormData()
        fd.set('text', text.trim())
        fd.set('theme', theme)
        if (isPrivate) fd.set('visibility', 'private')
        fd.set('image', img!.blob, img!.blob.type === 'image/webp' ? 'anh.webp' : 'anh.jpg')
        body = fd
      } else {
        body = JSON.stringify({ text: text.trim(), theme, ...(isPrivate ? { visibility: 'private' } : {}) })
      }
      const r = await fetch('/api/wishes', {
        method: 'POST',
        headers: {
          ...(withImg ? {} : { 'Content-Type': 'application/json' }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body,
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        showToast(data?.error ?? 'Gửi không thành công, thử lại nhé')
        return
      }
      setOpen(false)
      setText('')
      clearImg()
      if (data?.status === 'private' && typeof data.privateUrl === 'string') {
        setPriv(false)
        showToast(`Đã cất điều ước riêng tư${typeof data.no === 'number' ? ` #${data.no}` : ''}. Gửi link cho người bạn muốn nhé.`)
        router.push(data.privateUrl)
        return
      }
      const approved = data?.status === 'approved'
      // Vị trí trong hàng chờ = số đang chờ (trước khi cộng) + 1
      const queuePos = stats ? stats.pending + 1 : null
      bumpStats(approved ? 'approved' : 'pending')
      const tag = typeof data?.no === 'number' ? ` #${data.no}` : ''
      showToast(
        approved
          ? `Đã treo điều ước${tag} lên cây.`
          : queuePos
            ? `Đã gửi điều ước${tag}. Đang chờ duyệt, bạn đứng thứ ${queuePos} trong hàng. Lần sau đăng nhập Google là hiện ngay.`
            : `Đã gửi điều ước${tag}. Duyệt xong sẽ hiện trên cây. Lần sau đăng nhập Google là hiện ngay.`
      )
    } catch {
      showToast('Mất kết nối, thử lại sau nhé')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={`composer${open ? ' show' : ''}`}>
      <div className="composer-head">
        <LacBird className="lac" title="chim Lạc" />
        <h2>Gửi một điều ước</h2>
        <LacBird className="lac" flip title="chim Lạc" />
      </div>
      <p className="sub">Chọn nơi treo, rồi viết điều mình mong nhất.</p>

      {SHOW_AUTH &&
        (user ? (
          <div className="auth-row">
            <span className="auth-who">
              Đang đăng nhập: <b>{user.name}</b> · điều ước hiện ngay, thẻ lấp lánh
            </span>
            <Link className="auth-out" href="/tai-khoan">
              Ước của tôi
            </Link>
            <button className="auth-out" onClick={() => (DEMO_LOGIN ? setUser(null) : signOutUser())}>
              Đăng xuất
            </button>
          </div>
        ) : (
          // CTA đăng nhập: lợi ích rõ + nút Google lớn (nút gửi bên dưới cũng đổi thành "Gửi ẩn danh, chờ duyệt")
          <div className="auth-cta">
            <p className="auth-cta-t">Đăng nhập để treo ngay</p>
            <ul className="auth-perks" aria-label="Quyền lợi khi đăng nhập">
              <li>
                <Icon name="tree" size={14} />
                Hiện ngay
              </li>
              <li>
                <Icon name="sparkle" size={14} />
                Thẻ lấp lánh
              </li>
              <li>
                <Icon name="camera" size={14} />
                Kèm ảnh
              </li>
              <li>
                <Icon name="lock" size={14} />
                Riêng tư
              </li>
              <li>
                <Icon name="comment" size={14} />
                Bình luận
              </li>
            </ul>
            <button className="auth-google" onClick={() => login()}>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.2l7.9 6.2C12.4 13.6 17.7 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z" />
                <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.2C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.9-6.2z" />
                <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.2C6.6 42.6 14.6 48 24 48z" />
              </svg>
              Tiếp tục với Google
            </button>
            <span className="auth-legal">
              Đăng nhập là đồng ý <a href="/dieu-khoan">Điều khoản</a> & <a href="/chinh-sach-bao-mat">Bảo mật</a>
            </span>
          </div>
        ))}

      <div className="themes">
        {THEME_KEYS.map((k) => {
          const on = k === theme
          return (
            <button
              key={k}
              className={on ? 'on' : ''}
              style={on ? { background: THEMES[k].color } : undefined}
              onClick={() => setTheme(k)}
            >
              {THEMES[k].label}
            </button>
          )
        })}
      </div>
      <div className="wish-field">
        <LacBird className="lac-watermark" />
        <textarea
          maxLength={MAX_WISH_LEN}
          placeholder="Mình ước rằng…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      {user && (
        <div className="img-pick">
          {img ? (
            <div className="img-pick-prev">
              {/* eslint-disable-next-line @next/next/no-img-element -- ảnh xem trước cục bộ (blob:) */}
              <img src={img.url} alt="Ảnh sẽ đính kèm" />
              <button type="button" className="img-pick-x" aria-label="Bỏ ảnh" onClick={clearImg}>
                <Icon name="x" size={12} />
              </button>
            </div>
          ) : (
            <button type="button" className="img-pick-btn" disabled={imgBusy} onClick={() => fileRef.current?.click()}>
              <Icon name="camera" size={15} />
              {imgBusy ? 'Đang thu nhỏ ảnh…' : 'Thêm 1 ảnh'}
            </button>
          )}
          <span className="img-pick-note">{img ? 'Ảnh sẽ được nén gọn khi gửi' : 'Không bắt buộc'}</span>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickImg(e.target.files?.[0])} />
        </div>
      )}
      {user && (
        <div className="vis-row" role="radiogroup" aria-label="Ai xem được điều ước">
          <button role="radio" aria-checked={!priv} className={!priv ? 'on' : ''} onClick={() => setPriv(false)}>
            <Icon name="globe" size={14} />
            Công khai trên cây
          </button>
          <button role="radio" aria-checked={priv} className={priv ? 'on' : ''} onClick={() => setPriv(true)}>
            <Icon name="lock" size={14} />
            Riêng tư · chỉ ai có link
          </button>
        </div>
      )}
      <div className="row">
        <button
          className="btn-cancel"
          onClick={() => setOpen(false)}
          disabled={sending}
        >
          Để sau
        </button>
        <button className="btn-send" onClick={send} disabled={sending || imgBusy}>
          {sending
            ? user || !SHOW_AUTH
              ? 'Đang treo…'
              : 'Đang gửi…'
            : isPrivate
              ? 'Cất riêng tư'
              : user || !SHOW_AUTH
              ? 'Treo lên cây'
              : 'Gửi ẩn danh'}
        </button>
      </div>
    </div>
  )
}
