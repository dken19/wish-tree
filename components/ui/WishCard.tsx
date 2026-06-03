'use client'
import { THEMES } from '@/lib/themes'
import { useScene } from '@/store/useScene'

// Thẻ đọc điều ước (mở khi click một tờ giấy).
export default function WishCard() {
  const openWish = useScene((s) => s.openWish)
  const setOpenWish = useScene((s) => s.setOpenWish)
  const theme = openWish ? THEMES[openWish.theme] : null

  return (
    <div
      className={`scrim${openWish ? ' show' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpenWish(null)
      }}
    >
      <div className="card">
        <button
          className="close"
          onClick={() => setOpenWish(null)}
          aria-label="Đóng"
        >
          ✕
        </button>
        <div
          className="seal"
          style={
            theme
              ? { color: theme.color, borderColor: theme.color }
              : undefined
          }
        >
          Ước
        </div>
        <span
          className="tag"
          style={theme ? { background: theme.color } : undefined}
        >
          {theme?.label ?? 'Điều ước'}
        </span>
        <p className="text">{openWish ? `“${openWish.text}”` : ''}</p>
        <div className="meta">
          <span>— {openWish?.author ? openWish.author : 'một người gửi gió'} —</span>
          <span>🌙</span>
        </div>
      </div>
    </div>
  )
}
