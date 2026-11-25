'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useScene } from '@/store/useScene'
import { isFirebaseConfigured } from '@/lib/firebase.client'
import { signInGoogle, signOutUser } from '@/lib/auth'
import Icon from './Icon'

// Bản dev chưa có Firebase vẫn hiện nút để xem giao diện (giống Composer); prod thì ẩn.
const SHOW = isFirebaseConfigured || process.env.NODE_ENV !== 'production'

/**
 * Nút hình người cạnh huy hiệu giờ (góc trên-phải trang chủ): bấm mở menu nhỏ.
 * Chưa đăng nhập -> "Tiếp tục với Google"; đã đăng nhập -> ảnh đại diện + "Điều ước của tôi" (/tai-khoan) + Đăng xuất.
 * user lấy từ store (AuthBridge ở HomeClient ghi vào).
 */
export default function AccountButton() {
  const user = useScene((s) => s.user)
  const showToast = useScene((s) => s.showToast)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  // bấm ra ngoài / Esc -> đóng
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!SHOW) return null

  const login = async () => {
    if (!isFirebaseConfigured) {
      showToast('Bản dev chưa cấu hình Firebase nên chưa đăng nhập được')
      return
    }
    setBusy(true)
    try {
      await signInGoogle()
      setOpen(false)
    } catch (e) {
      const code = (e as { code?: string })?.code
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request')
        showToast('Chưa đăng nhập được, thử lại nhé')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="acct" ref={boxRef}>
      <button
        className={`acct-btn${user ? ' in' : ''}`}
        aria-label={user ? `Tài khoản: ${user.name}` : 'Đăng nhập'}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        {user?.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photo} alt="" width={30} height={30} referrerPolicy="no-referrer" />
        ) : (
          <Icon name="user" size={18} />
        )}
      </button>

      {open && (
        <div className="acct-menu" role="menu">
          {user ? (
            <>
              <p className="acct-who">
                <span>Đang đăng nhập</span>
                <b>{user.name}</b>
              </p>
              <Link href="/tai-khoan" className="acct-item" role="menuitem" onClick={() => setOpen(false)}>
                <Icon name="list" size={16} />
                Điều ước của tôi
              </Link>
              <button
                className="acct-item"
                role="menuitem"
                onClick={() => {
                  signOutUser()
                  setOpen(false)
                }}
              >
                <Icon name="logout" size={16} />
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <p className="acct-who">
                <b>Đăng nhập để</b>
                <span>điều ước hiện ngay, thẻ lấp lánh, và đánh dấu ước nào đã đạt được.</span>
              </p>
              <button className="acct-item primary" role="menuitem" disabled={busy} onClick={login}>
                <Icon name="user" size={16} />
                {busy ? 'Đang mở…' : 'Tiếp tục với Google'}
              </button>
              <Link href="/tai-khoan" className="acct-item" role="menuitem" onClick={() => setOpen(false)}>
                <Icon name="list" size={16} />
                Điều ước của tôi
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  )
}
