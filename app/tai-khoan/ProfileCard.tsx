'use client'
import { useRef, useState } from 'react'
import Icon from '@/components/ui/Icon'
import { getIdToken, refreshAuthUser, signOutUser, type AuthUser } from '@/lib/auth'
import { shrinkImage } from '@/lib/imageResize'
import { NAME_MAX, NAME_MIN, cleanDisplayName } from '@/lib/wishMeta'

type Props = {
  user: AuthUser
  demo: boolean
  onChange: (u: AuthUser) => void
}

// Thẻ hồ sơ ở /tai-khoan: ảnh đại diện (bấm để đổi, nén WebP ở server -> Firebase Storage) + tên hiển thị
// (đổi ở Firebase Auth + tên trên điều ước/bình luận cũ) + đăng xuất. API: /api/me/profile.
export default function ProfileCard({ user, demo, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user.name)
  const [busy, setBusy] = useState<'name' | 'photo' | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const call = async (init: RequestInit) => {
    const token = await getIdToken()
    const r = await fetch('/api/me/profile', {
      ...init,
      headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
    })
    const body = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(body?.error ?? 'Chưa lưu được, thử lại nhé')
    return body as { name?: string; photo?: string | null }
  }

  const after = async (patch: Partial<AuthUser>) => {
    // nạp lại hồ sơ + token mới để lần gửi điều ước/bình luận tới mang tên/ảnh mới
    const fresh = await refreshAuthUser().catch(() => null)
    onChange(fresh ?? { ...user, ...patch })
  }

  const saveName = async () => {
    const n = cleanDisplayName(name)
    if (n.length < NAME_MIN || n.length > NAME_MAX) {
      setMsg({ ok: false, text: `Tên cần từ ${NAME_MIN} đến ${NAME_MAX} ký tự` })
      return
    }
    if (n === user.name) {
      setEditing(false)
      return
    }
    setMsg(null)
    if (demo) {
      onChange({ ...user, name: n })
      setEditing(false)
      return
    }
    setBusy('name')
    try {
      await call({ method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: n }) })
      await after({ name: n })
      setEditing(false)
      setMsg({ ok: true, text: 'Đã đổi tên. Các điều ước cũ cũng hiện tên mới.' })
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message })
    } finally {
      setBusy(null)
    }
  }

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setMsg({ ok: false, text: 'Chọn một file ảnh nhé' })
      return
    }
    setMsg(null)
    setBusy('photo')
    try {
      const blob = await shrinkImage(file)
      if (blob.size > 4 * 1024 * 1024) throw new Error('Ảnh lớn quá (tối đa 4 MB)')
      if (demo) {
        onChange({ ...user, photo: URL.createObjectURL(blob) })
        return
      }
      const res = await call({ method: 'POST', headers: { 'Content-Type': blob.type || 'image/jpeg' }, body: blob })
      await after({ photo: res.photo ?? null })
      setMsg({ ok: true, text: 'Đã cập nhật ảnh đại diện.' })
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message || 'Chưa tải ảnh lên được, thử lại nhé' })
    } finally {
      setBusy(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const resetPhoto = async () => {
    if (demo) return onChange({ ...user, photo: null })
    setMsg(null)
    setBusy('photo')
    try {
      const res = await call({ method: 'DELETE' })
      await after({ photo: res.photo ?? null })
      setMsg({ ok: true, text: 'Đã dùng lại ảnh Google.' })
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message })
    } finally {
      setBusy(null)
    }
  }

  // ảnh tự tải lên nằm ở Firebase Storage -> mới hiện nút "Dùng ảnh Google"
  const ownPhoto = !!user.photo && user.photo.includes('firebasestorage') && user.photo.includes('avatars')

  return (
    <section className="acc-profile" aria-label="Hồ sơ của bạn">
      <button
        type="button"
        className="acc-avatar"
        onClick={() => fileRef.current?.click()}
        disabled={!!busy}
        aria-label="Đổi ảnh đại diện"
      >
        {user.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photo} alt="" width={72} height={72} referrerPolicy="no-referrer" />
        ) : (
          <span className="acc-avatar-ph">{user.name.trim().charAt(0).toUpperCase() || '?'}</span>
        )}
        <span className="acc-avatar-cam" aria-hidden>
          <Icon name="camera" size={15} />
        </span>
        {busy === 'photo' && <span className="acc-avatar-busy" aria-hidden />}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => pickPhoto(e.target.files?.[0])}
      />

      <div className="acc-profile-main">
        {editing ? (
          <form
            className="acc-name-form"
            onSubmit={(e) => {
              e.preventDefault()
              saveName()
            }}
          >
            <input
              className="pg-input"
              value={name}
              maxLength={NAME_MAX}
              autoFocus
              aria-label="Tên hiển thị"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setName(user.name)
                  setEditing(false)
                }
              }}
            />
            <button className="pg-btn primary" type="submit" disabled={busy === 'name'}>
              {busy === 'name' ? 'Đang lưu…' : 'Lưu'}
            </button>
            <button
              className="pg-btn ghost"
              type="button"
              onClick={() => {
                setName(user.name)
                setEditing(false)
              }}
            >
              Huỷ
            </button>
          </form>
        ) : (
          <p className="acc-name">
            <b>{user.name}</b>
            <button
              type="button"
              className="pg-act"
              onClick={() => {
                setName(user.name)
                setEditing(true)
                setMsg(null)
              }}
            >
              <Icon name="pen" size={14} />
              Đổi tên
            </button>
          </p>
        )}
        <p className="acc-profile-hint">
          Tên và ảnh này hiện trên điều ước, bình luận của bạn.
          {ownPhoto && (
            <>
              {' '}
              <button type="button" className="acc-linkbtn" onClick={resetPhoto} disabled={!!busy}>
                Dùng lại ảnh Google
              </button>
            </>
          )}
        </p>
        {msg && <p className={`acc-profile-msg${msg.ok ? '' : ' err'}`}>{msg.text}</p>}
      </div>

      <button className="pg-btn ghost acc-logout" disabled={demo} onClick={() => signOutUser()}>
        <Icon name="logout" size={16} />
        Đăng xuất
      </button>
    </section>
  )
}
