'use client'

// Hoạ tiết chim Lạc (Đông Sơn) — dùng ảnh mẫu khắc đồng (đen/nền trắng).
// Nền trắng được loại bằng CSS mix-blend-mode: multiply (xem globals.css).
// Mặc định chim quay sang PHẢI; flip=true để soi gương (quay trái).
export default function LacBird({
  className,
  flip = false,
  title,
}: {
  className?: string
  flip?: boolean
  title?: string
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/chim-lac.jpg"
      alt={title ?? ''}
      className={className}
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
      draggable={false}
    />
  )
}
