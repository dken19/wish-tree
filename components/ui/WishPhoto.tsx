'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'
import type { WishImage } from '@/lib/wishMeta'

/**
 * Khung co theo tỉ lệ ảnh nhưng KẸP trong [min, max] (rộng/cao) để không quá cao/quá dẹt:
 * thẻ đọc 4:3 → 2:1 (thẻ nằm gọn trong màn hình), trang chi tiết 4:5 → 2:1. Vé danh sách luôn vuông.
 */
const RATIO: Record<'card' | 'detail', [number, number]> = { card: [4 / 3, 2], detail: [4 / 5, 2] }

/**
 * Ảnh đính kèm điều ước (WebP do server nén, Firebase Storage). Bấm -> xem lớn (lightbox, Esc/chạm nền để đóng).
 * variant: 'card' (thẻ đọc ở cây), 'thumb' (vé danh sách, ô vuông nhỏ), 'detail' (trang chi tiết).
 * Ảnh LUÔN hiện nguyên vẹn (contain, không cắt) trong khung tỉ lệ kẹp; nếu tỉ lệ ảnh nằm ngoài khoảng kẹp
 * (ảnh dọc 9:16, ảnh panorama…) thì phần trống được lấp bằng CHÍNH ảnh đó phóng to + làm mờ (.wp-fill).
 * Vé danh sách: cắt vuông (cover) cho đều hàng. Khung có aspect-ratio sẵn -> không nhảy layout khi ảnh tải.
 */
export default function WishPhoto({
  image,
  variant,
  alt = 'Ảnh kèm điều ước',
}: {
  image: WishImage
  variant: 'card' | 'thumb' | 'detail'
  alt?: string
}) {
  const [open, setOpen] = useState(false)
  const [broken, setBroken] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (broken) return null
  const r = image.w / image.h
  const box = variant === 'thumb' ? 1 : Math.min(RATIO[variant][1], Math.max(RATIO[variant][0], r))
  // Luôn vẽ lớp mờ lấp đầy (trừ vé vuông cover): ngoài lệch tỉ lệ, khung còn bị max-height ép dẹt ở màn hình
  // thấp (chi tiết 70dvh, thẻ đọc 30dvh) -> có thể có dải trống dù tỉ lệ ảnh nằm trong khoảng kẹp.
  const fill = variant !== 'thumb'
  return (
    <>
      <button
        type="button"
        className={`wp wp-${variant}${fill ? ' has-fill' : ''}`}
        style={{ aspectRatio: String(box) }}
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        aria-label="Xem ảnh lớn"
      >
        {fill && (
          // cùng URL -> trình duyệt dùng lại ảnh đã tải, không tốn thêm mạng
          // eslint-disable-next-line @next/next/no-img-element
          <img className="wp-fill" src={image.url} alt="" aria-hidden width={image.w} height={image.h} decoding="async" />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element -- ảnh đã nén WebP ở server, không cần next/image tối ưu lại */}
        <img
          className="wp-main"
          src={image.url}
          alt={alt}
          width={image.w}
          height={image.h}
          // thẻ đọc + trang chi tiết: ảnh nằm ngay đầu -> tải ngay; vé danh sách: lazy
          loading={variant === 'thumb' ? 'lazy' : 'eager'}
          fetchPriority={variant === 'detail' ? 'high' : undefined}
          decoding="async"
          onError={() => setBroken(true)}
        />
      </button>
      {open &&
        createPortal(
          <div className="wp-box" role="dialog" aria-modal="true" aria-label={alt} onClick={() => setOpen(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt={alt} width={image.w} height={image.h} />
            <button className="wp-close" aria-label="Đóng" onClick={() => setOpen(false)}>
              <Icon name="x" size={20} />
            </button>
          </div>,
          document.body
        )}
    </>
  )
}
