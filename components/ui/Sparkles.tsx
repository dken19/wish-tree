// Lấp lánh cho thẻ điều ước của người đăng nhập (verified) — làm thẻ NỔI BẬT hẳn:
// viền vàng có ánh sáng chạy vòng + hào quang "thở" bên ngoài + sao 4 cánh nhấp nháy + vệt sáng quét.
// Thuần CSS, chỉ animate transform/opacity (compositor) -> rẻ trên mobile; tắt chuyển động khi reduced-motion.
// Đặt trong phần tử cha có `position: relative` (thẻ cha đã có border-radius thì viền ăn theo).
const STAR =
  'M12 0c.7 6.4 5.6 11.3 12 12-6.4.7-11.3 5.6-12 12-.7-6.4-5.6-11.3-12-12C6.4 11.3 11.3 6.4 12 0z'

const STARS = [
  { x: 6, y: 12, s: 14, d: 0 },
  { x: 92, y: 9, s: 18, d: 0.7 },
  { x: 96, y: 88, s: 12, d: 1.4 },
  { x: 3, y: 92, s: 16, d: 2.1 },
  { x: 50, y: 5, s: 10, d: 2.8 },
  { x: 97, y: 46, s: 11, d: 1.1 },
  { x: 3, y: 50, s: 9, d: 1.8 },
  { x: 60, y: 94, s: 10, d: 0.4 },
]

/**
 * `glow`: hào quang tràn ra ngoài thẻ (tắt cho vé bị mask cắt mép).
 * `compact` (vé danh sách): bỏ sao ở mép trái (đè số #N ở cuống) + sao không drop-shadow -> nhẹ hơn khi danh sách dài.
 */
export default function Sparkles({ glow = true, compact = false }: { glow?: boolean; compact?: boolean }) {
  return (
    <>
      {glow && <span className="spk-glow" aria-hidden />}
      <span className="spk-ring" aria-hidden />
      <span className={`spk${compact ? ' spk-compact' : ''}`} aria-hidden>
        <span className="spk-sheen" />
        {(compact ? STARS.filter((p) => p.x > 20) : STARS).map((p, i) => (
          <svg
            key={i}
            className="spk-star"
            viewBox="0 0 24 24"
            width={p.s}
            height={p.s}
            style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${p.d}s` }}
          >
            <path d={STAR} />
          </svg>
        ))}
      </span>
    </>
  )
}
