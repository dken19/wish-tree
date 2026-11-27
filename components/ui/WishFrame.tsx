// Lớp KHUNG trang trí tờ ước (lib/wishFrames). Đặt làm con ĐẦU TIÊN của tờ giấy (.wd-paper / .card):
// position absolute, z-index -1 trong stacking context của tờ giấy (tờ giấy có transform) -> nằm trên nền
// giấy nhưng DƯỚI chữ/ảnh. Màu = currentColor (đặt qua --wfr-c theo điểm nhấn skin). Chỉ SVG/CSS, không ảnh ngoài.
import type { WishFrameKey } from '@/lib/wishFrames'

/** Mặt trời trống đồng Đông Sơn: 12 tia + vòng tròn (tính 1 lần lúc nạp module). */
const SUN_RAYS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2
  const p = (r: number, d: number) => `${(Math.cos(a + d) * r).toFixed(2)} ${(Math.sin(a + d) * r).toFixed(2)}`
  return `M${p(5.5, -0.22)} L${p(16, 0)} L${p(5.5, 0.22)}Z`
}).join(' ')

function Sun() {
  return (
    <svg viewBox="-20 -20 40 40">
      <circle r="3.6" fill="currentColor" />
      <path d={SUN_RAYS} fill="currentColor" />
      <circle r="18.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

/** Mây cuộn (góc trên-trái; 3 góc còn lại lật bằng CSS). */
function Cloud() {
  return (
    <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M5 44 C5 21 21 5 44 5" />
      <path d="M44 5 c11 0 15 11 8 16 c-5 4 -12 0 -9 -5" />
      <path d="M5 44 c0 11 11 15 16 8 c4 -5 0 -12 -5 -9" />
      <path d="M17 31 c0 -8 6 -14 14 -14" opacity=".7" />
      <path d="M31 17 c6 0 8 6 4 9" opacity=".7" />
      <path d="M58 6 h14" opacity=".55" />
      <path d="M6 58 v14" opacity=".55" />
    </svg>
  )
}

/** Hai lá tre (góc trên-trái và dưới-phải). */
function Leaves() {
  return (
    <svg viewBox="0 0 90 60" fill="currentColor">
      <path d="M4 8 C26 10 50 18 86 34 C58 32 30 24 4 8Z" opacity=".85" />
      <path d="M4 8 C22 22 38 38 52 58 C34 50 16 34 4 8Z" opacity=".6" />
      <path d="M4 8 C30 4 52 6 74 12 C50 16 26 14 4 8Z" opacity=".45" />
    </svg>
  )
}

/** Mũi thêu chữ thập ở góc. */
function Stitch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M5 5 L13 13 M13 5 L5 13" />
      <path d="M13 13 L19 19 M19 13 L13 19" opacity=".6" />
    </svg>
  )
}

/** Đoá sen nở trên mặt nước (giữa chân khung). */
function Lotus() {
  return (
    <svg viewBox="0 0 120 52" fill="currentColor">
      <path d="M60 46 C40 46 20 40 9 29 C28 27 48 33 60 46Z" opacity=".45" />
      <path d="M60 46 C80 46 100 40 111 29 C92 27 72 33 60 46Z" opacity=".45" />
      <path d="M60 46 C44 40 32 27 30 12 C45 17 57 29 60 46Z" opacity=".7" />
      <path d="M60 46 C76 40 88 27 90 12 C75 17 63 29 60 46Z" opacity=".7" />
      <path d="M60 4 C71 17 71 34 60 46 C49 34 49 17 60 4Z" />
      <path d="M22 50 H98" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity=".5" />
    </svg>
  )
}

export default function WishFrame({ frame }: { frame: WishFrameKey | null | undefined }) {
  if (!frame || frame === 'tron') return null
  const corners = (Node: () => React.ReactElement, cls = 'wfr-c') =>
    (['tl', 'tr', 'bl', 'br'] as const).map((k) => (
      <span key={k} className={`${cls} wfr-${k}`}>
        <Node />
      </span>
    ))
  return (
    <span className={`wfr wfr-${frame}`} aria-hidden>
      {frame === 'dong-son' && corners(Sun)}
      {frame === 'may' && corners(Cloud)}
      {frame === 'chi-theu' && corners(Stitch)}
      {frame === 'tre' && (
        <>
          <span className="wfr-leaf wfr-tl">
            <Leaves />
          </span>
          <span className="wfr-leaf wfr-br">
            <Leaves />
          </span>
        </>
      )}
      {frame === 'sen' && (
        <span className="wfr-lotus">
          <Lotus />
        </span>
      )}
    </span>
  )
}
