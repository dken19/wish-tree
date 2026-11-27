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

// Cảnh nền nhiều lớp (viewBox 1440x320, bám đáy màn hình): núi xa + chùa trên đỉnh / đồi giữa / rặng thông gần.
// Màu theo mốc giờ (CSS --ls-*), lớp gần dịch theo chuột nhiều hơn (parallax --px/--py).
const LAND_FAR = 'M0 320V176L70 150 150 162 250 100 330 140 420 112 520 48 600 112 690 94 790 146 880 76 980 126 1060 100 1150 152 1240 90 1340 136 1440 108V320ZM500 50h40l-6 -6h-28zM506 44h28l-5 -6h-18zM511 38h18l-9 -10zM512 50h16v8h-16z'
const LAND_MID = 'M0 320V214C110 182 220 196 330 206S540 160 700 184 950 226 1080 196 1310 160 1440 188V320Z'
const LAND_NEAR = 'M0 320V276C160 262 330 280 520 272S900 262 1100 270 1330 262 1440 268V320ZM30 134L49 197H11ZM30 167L57 227H3ZM30 200L65 257H-5ZM26 254h8V284h-8ZM95 94L117 174H73ZM95 136L126 212H64ZM95 178L135 250H55ZM90 246h10V284h-10ZM160 154L177 209H143ZM160 183L184 235H136ZM160 211L191 261H129ZM156 258h7V284h-7ZM215 188L228 228H202ZM215 209L233 248H197ZM215 230L239 267H191ZM212 265h6V284h-6ZM1250 174L1265 220H1235ZM1250 198L1271 242H1229ZM1250 222L1277 264H1223ZM1247 262h6V284h-6ZM1305 114L1325 185H1285ZM1305 151L1333 219H1277ZM1305 189L1341 253H1269ZM1301 250h9V284h-9ZM1370 79L1394 165H1346ZM1370 124L1403 206H1337ZM1370 169L1413 247H1327ZM1365 243h10V284h-10ZM1425 144L1443 203H1407ZM1425 175L1450 231H1400ZM1425 206L1457 259H1393ZM1421 256h8V284h-8ZM234 280a26 26 0 0 1 52 0ZM282 280a18 18 0 0 1 36 0ZM1171 280a24 24 0 0 1 48 0ZM1144 280a16 16 0 0 1 32 0ZM606 280a14 14 0 0 1 28 0ZM842 280a18 18 0 0 1 36 0ZM395 132L413 195H377ZM395 165L420 225H370ZM395 198L427 255H363ZM391 252h8V282h-8ZM445 87L467 169H423ZM445 130L476 208H414ZM445 173L485 247H405ZM440 243h10V282h-10ZM492 162L507 212H477ZM492 188L513 236H471ZM492 215L519 260H465ZM489 258h6V282h-6ZM955 152L971 207H939ZM955 181L977 233H933ZM955 209L984 259H926ZM952 256h7V282h-7ZM1010 97L1031 175H989ZM1010 138L1040 212H980ZM1010 178L1049 249H971ZM1005 245h9V282h-9ZM1062 142L1078 201H1046ZM1062 173L1085 229H1039ZM1062 204L1092 257H1032ZM1058 254h7V282h-7Z'

function Land({ layer, d }: { layer: string; d: string }) {
  return (
    <svg className={`pg-land ${layer}`} viewBox="0 0 1440 320" preserveAspectRatio="xMidYMax slice">
      <path d={`${d}M0 318H1440V1400H0Z`} fill="currentColor" />
    </svg>
  )
}

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

/** Nền trời 4 mốc (bình minh / trưa / hoàng hôn / đêm) + sao + đèn trời — CSS thuần, chỉ transform.
 *  `theme` = chủ đề điều ước (lib/themes) -> đèn đổi màu + dáng theo chủ đề (CSS [data-theme] ở pages.css). */
export function PageSky({ theme }: { theme?: string | null }) {
  return (
    <div className="pg-sky" aria-hidden="true" data-theme={theme ?? undefined}>
      <i className="pg-layer dawn" />
      <i className="pg-layer day" />
      <i className="pg-layer dusk" />
      <i className="pg-layer night" />
      <i className="pg-stars" />
      <i className="pg-orb" />
      <Land layer="far" d={LAND_FAR} />
      <i className="pg-mist" />
      <Land layer="mid" d={LAND_MID} />
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
            {/* .ld-lift: lớp nâng khi chạm (translate cộng dồn qua --lift), tách khỏi animation bay/lắc */}
            <b className="ld-lift">
              <i />
            </b>
          </span>
        ))}
      </div>
      <Land layer="near" d={LAND_NEAR} />
    </div>
  )
}

/** Chạm đèn trời phía sau: lớp cuộn che đèn nên dò bằng elementsFromPoint (đèn có pointer-events:auto
 *  để được dò trúng). Chạm trúng -> đèn sáng bừng + vút lên một đoạn (cộng dồn, có trần).
 *  Chuột: trời dịch nhẹ theo con trỏ (parallax) qua biến CSS --px/--py, ghi thẳng DOM trong rAF. */
const INTERACTIVE = 'a,button,input,select,textarea,label,summary,[role="button"],[tabindex]'

function lanternAt(x: number, y: number): HTMLElement | null {
  for (const el of document.elementsFromPoint(x, y)) {
    const lift = el.closest<HTMLElement>('.pg-lanterns .ld-lift')
    if (lift) return lift
  }
  return null
}

function useLanternTouch(scrollRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = scrollRef.current
    const sky = document.querySelector<HTMLElement>('.pg-sky')
    if (!root || !sky) return
    let raf = 0
    let mx = 0
    let my = 0
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      mx = e.clientX
      my = e.clientY
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        sky.style.setProperty('--px', (mx / innerWidth - 0.5).toFixed(3))
        sky.style.setProperty('--py', (my / innerHeight - 0.5).toFixed(3))
        const t = document.elementFromPoint(mx, my)
        root.style.cursor = t && !t.closest(INTERACTIVE) && lanternAt(mx, my) ? 'pointer' : ''
      })
    }
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element).closest(INTERACTIVE)) return
      const lift = lanternAt(e.clientX, e.clientY)
      if (!lift) return
      const cur = Number(lift.dataset.lift || 0)
      const next = Math.max(cur - 70, -280)
      lift.dataset.lift = String(next)
      lift.style.setProperty('--lift', `${next}px`)
      lift.classList.remove('lit')
      void lift.offsetWidth // khởi động lại animation sáng bừng
      lift.classList.add('lit')
      navigator.vibrate?.(8)
    }
    // Cuộn: --sy (px, trần 900) -> núi/đồi/thông trồi lên mỗi lớp một tốc độ, trăng/mặt trời lặn xuống.
    let sraf = 0
    const onScroll = () => {
      if (sraf) return
      sraf = requestAnimationFrame(() => {
        sraf = 0
        sky.style.setProperty('--sy', String(Math.min(root.scrollTop, 900) | 0))
      })
    }
    root.addEventListener('scroll', onScroll, { passive: true })
    // Điện thoại (không chuột): nghiêng máy -> parallax (Android; iOS cần xin quyền nên bỏ qua).
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: unknown } | undefined
    const tilt = !matchMedia('(hover: hover)').matches && DOE && typeof DOE.requestPermission !== 'function'
    let traf = 0
    let gx = 0
    let gy = 0
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return
      gx = Math.max(-1, Math.min(1, e.gamma / 30)) * 0.5
      gy = Math.max(-1, Math.min(1, (e.beta - 45) / 30)) * 0.5
      if (traf) return
      traf = requestAnimationFrame(() => {
        traf = 0
        sky.style.setProperty('--px', gx.toFixed(3))
        sky.style.setProperty('--py', gy.toFixed(3))
      })
    }
    if (tilt) window.addEventListener('deviceorientation', onTilt)
    root.addEventListener('pointermove', onMove, { passive: true })
    root.addEventListener('click', onClick)
    return () => {
      cancelAnimationFrame(raf)
      cancelAnimationFrame(sraf)
      cancelAnimationFrame(traf)
      window.removeEventListener('deviceorientation', onTilt)
      root.removeEventListener('scroll', onScroll)
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('click', onClick)
    }
  }, [scrollRef])
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
  clock = true,
  skyTheme,
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
  /** Dòng giờ Hà Nội dưới tiêu đề; /dieu-uoc tắt cho gọn (người vào chỉ để xem điều ước). */
  clock?: boolean
  /** Chủ đề đang xem (vd /dieu-uoc?theme=yeu) -> đèn trời nền đổi kiểu theo chủ đề. */
  skyTheme?: string | null
  children: React.ReactNode
}) {
  const clockRef = useRef<HTMLSpanElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  useSkyClock(clockRef)
  useLanternTouch(scrollRef)
  return (
    <div className="pg">
      <PageSky theme={skyTheme} />
      <div className="pg-scroll" ref={scrollRef}>
        <header className="pg-hero">
          <div className="pg-wrap">
            {/* Nút về cây CÙNG DÒNG tiêu đề, căn giữa theo dòng tiêu đề (header thấp, dễ bấm back). */}
            <div className="pg-hero-row">
              <Link href="/" className="pg-back" aria-label={backLabel} title={backLabel}>
                <Icon name="back" size={20} />
              </Link>
              {aside}
              <h1 className={plainTitle ? 'plain' : undefined}>{title}</h1>
            </div>
            {(lead || stats || clock) && (
              <div className="pg-hero-sub">
                {lead && <p className="pg-lead">{lead}</p>}
                {stats}
                {clock && (
                  <p className="pg-clock">
                    <span ref={clockRef} />
                  </p>
                )}
              </div>
            )}
          </div>
        </header>
        <main className="pg-sheet">
          <div className="pg-wrap">{children}</div>
        </main>
      </div>
    </div>
  )
}
