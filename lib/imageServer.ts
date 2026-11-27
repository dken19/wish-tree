// Server-only: giải mã + nén ảnh người dùng tải lên (sharp -> WebP) và lưu lên Firebase Storage
// với URL tải công khai kiểu Firebase (token) — dùng cho ảnh đại diện + ảnh đính kèm điều ước.
import 'server-only'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { getAdminBucket } from './firebase.admin'

/** Ảnh gốc tối đa nhận ở server (client đã thu nhỏ trước; Vercel giới hạn body 4,5 MB). */
export const MAX_UPLOAD = 4 * 1024 * 1024

export type WebpResult = { buf: Buffer; w: number; h: number }

/**
 * Nén lại ở SERVER (không tin file client): xoay theo EXIF, bỏ metadata (GPS…), WebP.
 * `square` = cắt vuông đúng cạnh (ảnh đại diện); không thì thu vào khung max×max, giữ tỉ lệ, không phóng to.
 * Ảnh hỏng / không phải ảnh -> ném lỗi.
 */
export async function toWebp(input: Buffer, opts: { max: number; square?: boolean; quality: number }): Promise<WebpResult> {
  const img = sharp(input, { limitInputPixels: 40_000_000, animated: false }).rotate()
  const resized = opts.square
    ? img.resize(opts.max, opts.max, { fit: 'cover', position: 'attention' })
    : img.resize(opts.max, opts.max, { fit: 'inside', withoutEnlargement: true })
  const { data, info } = await resized.webp({ quality: opts.quality, effort: 4 }).toBuffer({ resolveWithObject: true })
  return { buf: data, w: info.width, h: info.height }
}

/** Lưu WebP lên Storage -> URL công khai (token tải Firebase, không phụ thuộc Storage rules). */
export async function uploadWebp(path: string, buf: Buffer): Promise<string> {
  const bucket = getAdminBucket()
  if (!bucket) throw new Error('storage-not-configured')
  const token = randomUUID()
  await bucket.file(path).save(buf, {
    resumable: false,
    contentType: 'image/webp',
    metadata: {
      // mỗi ảnh 1 đường dẫn riêng, không bao giờ ghi đè -> cache lâu thoải mái
      cacheControl: 'public, max-age=31536000, immutable',
      metadata: { firebaseStorageDownloadTokens: token },
    },
  })
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`
}

/** Xoá file (bỏ qua lỗi) — dọn ảnh cũ / ảnh của điều ước gửi hỏng. */
export async function deleteStorageFile(path: string) {
  try {
    await getAdminBucket()?.file(path).delete({ ignoreNotFound: true })
  } catch (e) {
    console.warn('[storage] chưa xoá được', path, e)
  }
}
