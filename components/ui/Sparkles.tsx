// Lấp lánh cho thẻ điều ước của người đăng nhập (verified): vài ngôi sao 4 cánh nhấp nháy
// + 1 vệt sáng quét chéo. Thuần CSS (transform/opacity) -> rẻ trên mobile; tắt khi reduced-motion.
// Đặt trong phần tử cha có `position: relative` (+ `overflow: hidden` nếu muốn cắt vệt sáng).
const STARS = [
  { x: 8, y: 14, s: 10, d: 0 },
  { x: 90, y: 10, s: 13, d: 0.7 },
  { x: 80, y: 78, s: 9, d: 1.4 },
  { x: 14, y: 84, s: 12, d: 2.1 },
  { x: 52, y: 6, s: 7, d: 2.8 },
  { x: 96, y: 46, s: 8, d: 1.1 },
]

export default function Sparkles() {
  return (
    <span className="spk" aria-hidden>
      <span className="spk-sheen" />
      {STARS.map((p, i) => (
        <svg
          key={i}
          className="spk-star"
          viewBox="0 0 24 24"
          width={p.s}
          height={p.s}
          style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${p.d}s` }}
        >
          <path d="M12 0c.7 6.4 5.6 11.3 12 12-6.4.7-11.3 5.6-12 12-.7-6.4-5.6-11.3-12-12C6.4 11.3 11.3 6.4 12 0z" />
        </svg>
      ))}
    </span>
  )
}

