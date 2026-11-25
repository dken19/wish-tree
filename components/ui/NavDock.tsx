'use client'
import { useRouter } from 'next/navigation'
import { useScene } from '@/store/useScene'
import Icon, { type IconName } from './Icon'

type Item = {
  key: string
  icon: IconName
  label: string
  hint: string
  run: (router: ReturnType<typeof useRouter>) => void
}

const ITEMS: Item[] = [
  {
    key: 'tree',
    icon: 'tree',
    label: 'Cây ước nguyện',
    hint: 'Về cây',
    run: () => {
      const s = useScene.getState()
      s.setRoomOpen(false)
      s.setComposerOpen(false)
      s.setOpenWish(null)
    },
  },
  {
    key: 'write',
    icon: 'pen',
    label: 'Viết điều ước',
    hint: 'Gửi điều ước lên cây',
    run: () => {
      const s = useScene.getState()
      s.setRoomOpen(false)
      s.setComposerOpen(true)
    },
  },
  {
    key: 'room',
    icon: 'book',
    label: 'Phòng ôn bài',
    hint: 'Học cùng nhau',
    run: () => {
      const s = useScene.getState()
      s.setComposerOpen(false)
      s.setRoomOpen(true)
    },
  },
  {
    key: 'skills',
    icon: 'leaf',
    label: 'Kỹ năng sống',
    hint: 'Nấu ăn, trồng rau, chụp ảnh',
    run: (router) => {
      router.push('/ky-nang')
    },
  },
  {
    key: 'all',
    icon: 'list',
    label: 'Tất cả ước nguyện',
    hint: 'Tìm theo số, chủ đề, ngày',
    run: (router) => {
      router.push('/dieu-uoc')
    },
  },
]

export default function NavDock() {
  const router = useRouter()
  const navOpen = useScene((s) => s.navOpen)
  const setNavOpen = useScene((s) => s.setNavOpen)
  const roomOpen = useScene((s) => s.roomOpen)
  const composerOpen = useScene((s) => s.composerOpen)

  // Phòng ôn bài (FocusHUD) và bảng viết (Composer) đều là sheet trượt từ đáy
  // → ẩn dock cho gọn, tránh chồng nút.
  if (roomOpen || composerOpen) return null

  const onPick = (it: Item) => {
    it.run(router)
    setNavOpen(false)
  }

  return (
    <div className={`navdock${navOpen ? ' open' : ''}`}>
      {/* lớp chạm trong suốt: bấm ra ngoài là đóng */}
      {navOpen && (
        <button
          className="nav-scrim"
          aria-label="Đóng menu"
          onClick={() => setNavOpen(false)}
        />
      )}

      <div className="nav-items">
        {ITEMS.map((it, i) => (
          <button
            key={it.key}
            className={`nav-item${it.key === 'tree' ? ' on' : ''}`}
            style={{ transitionDelay: navOpen ? `${i * 38}ms` : '0ms' }}
            onClick={() => onPick(it)}
          >
            <span className="nav-label">
              <b>{it.label}</b>
              <i>{it.hint}</i>
            </span>
            <span className="nav-ic">
              <Icon name={it.icon} size={22} />
            </span>
          </button>
        ))}
      </div>

      <button
        className="nav-fab"
        aria-label={navOpen ? 'Đóng menu' : 'Mở cuộn bí kíp'}
        aria-expanded={navOpen}
        onClick={() => setNavOpen(!navOpen)}
      >
        <span className="nav-fab-ic">{navOpen ? <Icon name="x" size={22} /> : 'Bí'}</span>
      </button>
    </div>
  )
}
