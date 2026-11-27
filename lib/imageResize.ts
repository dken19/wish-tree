// Client: thu nhỏ ảnh TRƯỚC khi tải lên (ảnh điện thoại 5–12 MB -> vài chục/trăm KB), đỡ tốn mạng và nằm
// dưới giới hạn body 4,5 MB của Vercel. Server vẫn giải mã + nén lại WebP (lib/imageServer, không tin client).
// Dùng cho ảnh đại diện (square, 512px) và ảnh đính kèm điều ước (giữ tỉ lệ, 1600px).
export async function shrinkImage(file: File, opts: { max: number; square?: boolean } = { max: 512, square: true }): Promise<Blob> {
  let bmp: ImageBitmap
  try {
    // tự xoay theo EXIF (ảnh dọc chụp điện thoại không bị nằm ngang)
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return file // định dạng trình duyệt không giải mã được (vd HEIC trên Chrome) -> để server thử
  }
  let sx = 0
  let sy = 0
  let sw = bmp.width
  let sh = bmp.height
  if (opts.square) {
    const side = Math.min(sw, sh)
    sx = (sw - side) / 2
    sy = (sh - side) / 2
    sw = sh = side
  }
  const k = Math.min(1, opts.max / Math.max(sw, sh))
  const w = Math.max(1, Math.round(sw * k))
  const h = Math.max(1, Math.round(sh * k))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h)
  bmp.close()
  const webp = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', 0.86))
  // Safari cũ không mã hoá được WebP (trả PNG nặng) -> dùng JPEG cho nhẹ
  if (webp && webp.type === 'image/webp') return webp
  const jpg = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.86))
  return jpg ?? file
}
