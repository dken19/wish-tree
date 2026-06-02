'use client'
import { useState } from 'react'
import { THEMES, THEME_KEYS, type ThemeKey } from '@/lib/themes'
import { MAX_WISH_LEN, validateWish } from '@/lib/profanity'
import { useScene } from '@/store/useScene'

// Bảng viết điều ước -> POST /api/wishes (vào hàng chờ duyệt).
export default function Composer() {
  const open = useScene((s) => s.composerOpen)
  const setOpen = useScene((s) => s.setComposerOpen)
  const showToast = useScene((s) => s.showToast)

  const [theme, setTheme] = useState<ThemeKey>('thi')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  async function send() {
    const v = validateWish(text)
    if (!v.ok) {
      showToast(v.reason)
      return
    }
    setSending(true)
    try {
      const r = await fetch('/api/wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), theme }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        showToast(data?.error ?? 'Gửi không thành công, thử lại nhé')
        return
      }
      setOpen(false)
      setText('')
      showToast('Đã gửi điều ước ✨ (chờ duyệt rồi sẽ hiện trên cây)')
    } catch {
      showToast('Mất kết nối, thử lại sau nhé')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={`composer${open ? ' show' : ''}`}>
      <h3>Gửi một điều ước</h3>
      <p className="sub">Chọn nơi treo, rồi viết điều mình mong nhất.</p>
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
      <textarea
        maxLength={MAX_WISH_LEN}
        placeholder="Mình ước rằng…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
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
