'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Icon from './Icon'
import { SKY_LABEL, phaseFromUrl, skyPhase, vnClock, type SkyPhase } from '@/lib/skyPhase'

// Đèn trời: x = vị trí ngang (%), s = cỡ (xa nhỏ/mờ, gần to/rõ), d = giây bay hết màn, delay âm =
// đã đang bay khi vào trang. Ban ngày chỉ hiện 5 chiếc đầu (CSS), chiều tối/đêm hiện hết.
const LANTERNS = [
  { x: 8, s: 1.15, d: 19, delay: -4 },
  { x: 88, s: 0.95, d: 21, delay: -12 },
  { x: 27, s: 0.55, d: 27, delay: -7 },
  { x: 64, s: 0.65, d: 25, delay: -18 },
  { x: 47, s: 0.4, d: 31, delay: -11 },
  { x: 95, s: 0.5, d: 29, delay: -2 },
  { x: 3, s: 0.45, d: 28, delay: -21 },
  { x: 37, s: 0.35, d: 33, delay: -26 },
  { x: 76, s: 1.3, d: 17, delay: -9 },
  { x: 58, s: 0.8, d: 23, delay: -15 },
  { x: 18, s: 0.7, d: 24, delay: -1 },
]

/** Cập nhật <html data-sky> + dòng giờ mỗi phút; KHÔNG setState (ghi thẳng DOM, đỡ re-render). */
function useSkyClock(clockRef: React.RefObject<HTMLSpanElement | null>) {
  useEffect(() => {
    const tick = () => {
      const forced = phaseFromUrl()
      const p: SkyPhase = forced ?? skyPhase()
      document.documentElement.setAttribute('data-sky', p)
      if (clockRef.current)
        clockRef.current.textContent = forced
          ? `Đang xem thử cảnh ${SKY_LABEL[p]}.`
          : `Hà Nội ${vnClock()}, trời đang ${SKY_LABEL[p]}.`
    }
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [clockRef])
}

/** Nền trời 4 mốc (bình minh / trưa / hoàng hôn / đêm) + sao + đèn trời — CSS thuần, chỉ transform. */
export function PageSky() {
  return (
    <div className="pg-sky" aria-hidden="true">
      <i className="pg-layer dawn" />
      <i className="pg-layer day" />
      <i className="pg-layer dusk" />
      <i className="pg-layer night" />
      <i className="pg-stars" />
      <div className="pg-lanterns">
        {LANTERNS.map((l, i) => (
          <span
            key={i}
            className="ld-lantern"
            style={
              {
                '--x': `${l.x}%`,
                '--s': l.s,
                '--d': `${l.d}s`,
                '--delay': `${l.delay}s`,
              } as React.CSSProperties
            }
          >
            <i />
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Khung chung các trang nội dung (KHÔNG Canvas): nền trời theo giờ VN phía sau, tiêu đề trên dải
 * trời, nội dung trên một "tờ" phẳng (đêm tự sang tông tối qua biến CSS ở app/pages.css).
 */
export default function PageShell({
  title,
  lead,
  aside,
  backLabel = 'Về cây ước nguyện',
  plainTitle = false,
  stats,
  children,
}: {
  title: string
  lead?: React.ReactNode
  aside?: React.ReactNode
  backLabel?: string
  /** Tiêu đề font thường thay cho thư pháp (/gioi-thieu: người duyệt Google OAuth phải đọc khớp tên app). */
  plainTitle?: boolean
  /** Khối số liệu dưới câu dẫn (vd /dieu-uoc: số điều ước đang treo + chờ duyệt). */
  stats?: React.ReactNode
  children: React.ReactNode
}) {
  const clockRef = useRef<HTMLSpanElement>(null)
  useSkyClock(clockRef)
  return (
    <div className="pg">
      <PageSky />
      <div className="pg-scroll">
        <header className="pg-hero">
          <div className="pg-wrap">
            <Link href="/" className="pg-back">
              <Icon name="back" size={16} />
              {backLabel}
            </Link>
            <div className="pg-hero-row">
              {aside}
              <div>
                <h1 className={plainTitle ? 'plain' : undefined}>{title}</h1>
                {lead && <p className="pg-lead">{lead}</p>}
                {stats}
                <p className="pg-clock">
                  <span ref={clockRef} />
                </p>
              </div>
            </div>
          </div>
        </header>
        <main className="pg-sheet">
          <div className="pg-wrap">{children}</div>
        </main>
      </div>
    </div>
  )
}
