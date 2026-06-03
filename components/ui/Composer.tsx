'use client'
import { useState } from 'react'
import { THEMES, THEME_KEYS, type ThemeKey } from '@/lib/themes'
import { MAX_WISH_LEN, validateWish } from '@/lib/profanity'
import { useScene } from '@/store/useScene'
import { isFirebaseConfigured } from '@/lib/firebase.client'
import { signInGoogle, signInFacebook, signOutUser, getIdToken } from '@/lib/auth'
import LacBird from './LacBird'

// Bảng viết điều ước -> POST /api/wishes.
// Người đăng nhập Google/Facebook: điều ước hiện NGAY; ẩn danh: vào hàng chờ duyệt.
export default function Composer() {
  const open = useScene((s) => s.composerOpen)
  const setOpen = useScene((s) => s.setComposerOpen)
  const showToast = useScene((s) => s.showToast)
  const user = useScene((s) => s.user)

  const [theme, setTheme] = useState<ThemeKey>('thi')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  async function login(provider: 'google' | 'facebook') {
    try {
      if (provider === 'google') await signInGoogle()
      else await signInFacebook()
    } catch {
      showToast('Đăng nhập chưa thành công, thử lại nhé')
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
      const r = await fetch('/api/wishes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text: text.trim(), theme }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        showToast(data?.error ?? 'Gửi không thành công, thử lại nhé')
        return
      }
      setOpen(false)
      setText('')
      showToast(
        data?.status === 'approved'
          ? 'Đã treo điều ước lên cây ✨'
          : 'Đã gửi điều ước ✨ (chờ duyệt rồi sẽ hiện trên cây)'
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
        <h3>Gửi một điều ước</h3>
        <LacBird className="lac" flip title="chim Lạc" />
      </div>
      <p className="sub">Chọn nơi treo, rồi viết điều mình mong nhất.</p>

      {isFirebaseConfigured &&
        (user ? (
          <div className="auth-row">
            <span className="auth-who">
              Đang đăng nhập: <b>{user.name}</b> · điều ước sẽ hiện ngay
            </span>
            <button className="auth-out" onClick={() => signOutUser()}>
              Đăng xuất
            </button>
          </div>
        ) : (
          <div className="auth-row">
            <span className="auth-hint">
              Đăng nhập để điều ước hiển thị ngay, khỏi chờ duyệt:
            </span>
            <div className="auth-btns">
              <button className="auth-in g" onClick={() => login('google')}>
                Google
              </button>
              <button className="auth-in f" onClick={() => login('facebook')}>
                Facebook
              </button>
            </div>
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
      <div className="row">
        <button
          className="btn-cancel"
          onClick={() => setOpen(false)}
          disabled={sending}
        >
          Để sau
        </button>
        <button className="btn-send" onClick={send} disabled={sending}>
          {sending ? 'Đang treo…' : 'Treo lên cây'}
        </button>
      </div>
    </div>
  )
}
