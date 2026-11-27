import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, getAdminAuth, isAdminConfigured } from '@/lib/firebase.admin'
import { validateWish } from '@/lib/profanity'
import { isThemeKey } from '@/lib/themes'
import { ipFromHeaders, rateLimit } from '@/lib/ratelimit'
import { counterRef, ensureNumbering, newShareKey } from '@/lib/wishServer'
import { privateWishPath, searchTokens, type WishImage } from '@/lib/wishMeta'
import { MAX_UPLOAD, deleteStorageFile, toWebp, uploadWebp } from '@/lib/imageServer'
import { getAdminBucket } from '@/lib/firebase.admin'

export const runtime = 'nodejs'

/** Ảnh đính kèm: thu vào khung 1280px, WebP q72 (~80–200 KB với ảnh chụp điện thoại). */
const WISH_IMG_PX = 1280
const WISH_IMG_Q = 72

// POST: gửi điều ước -> validate + lọc từ + rate-limit -> lưu (đăng nhập: approved/private, ẩn danh: pending).
// Body JSON { text, theme, visibility? } HOẶC multipart/form-data (cùng các field + `image` = 1 file ảnh,
// CHỈ người đăng nhập).
export async function POST(req: Request) {
  let body: { text?: string; theme?: string; author?: string; visibility?: string }
  let imageFile: File | null = null
  try {
    if ((req.headers.get('content-type') ?? '').startsWith('multipart/form-data')) {
      if (Number(req.headers.get('content-length') ?? 0) > MAX_UPLOAD + 64 * 1024)
        return NextResponse.json({ error: 'Ảnh lớn quá (tối đa 4 MB)' }, { status: 413 })
      const fd = await req.formData()
      const str = (k: string) => (typeof fd.get(k) === 'string' ? String(fd.get(k)) : undefined)
      body = { text: str('text'), theme: str('theme'), visibility: str('visibility') }
      const f = fd.get('image')
      if (f && typeof f !== 'string' && f.size > 0) imageFile = f
    } else {
      body = await req.json()
    }
  } catch {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 })
  }

  const text = String(body.text ?? '')
  const theme = String(body.theme ?? '')
  const author = body.author ? String(body.author).slice(0, 40) : undefined

  if (!isThemeKey(theme))
    return NextResponse.json({ error: 'Chủ đề không hợp lệ' }, { status: 400 })

  const v = validateWish(text)
  if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 })

  const ip = ipFromHeaders(req.headers)
  const rl = rateLimit(`wish:${ip}`)
  if (!rl.ok)
    return NextResponse.json(
      { error: 'Bạn gửi hơi nhanh, thử lại sau ít phút nhé.' },
      { status: 429 }
    )

  if (!isAdminConfigured) {
    return NextResponse.json(
      { error: 'Máy chủ chưa cấu hình lưu trữ (Firebase Admin)' },
      { status: 503 }
    )
  }

  // Người đăng nhập (Google/Facebook): xác minh ID token -> đăng NGAY (approved).
  // Token sai/hết hạn/không có -> giữ hành vi cũ: vào hàng chờ duyệt (pending).
  let uid: string | null = null
  let authorName = author
  const bearer = req.headers.get('authorization')
  const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : null
  if (token) {
    try {
      // checkRevoked=true: tài khoản bị admin khoá (disabled) / thu hồi phiên -> ném lỗi
      const decoded = await getAdminAuth()!.verifyIdToken(token, true)
      uid = decoded.uid
      if (decoded.name) authorName = String(decoded.name).slice(0, 40)
    } catch (e) {
      const code = (e as { code?: string })?.code
      if (code === 'auth/user-disabled')
        return NextResponse.json({ error: 'Tài khoản của bạn đã bị tạm khoá. Liên hệ người giữ cây nếu có nhầm lẫn.' }, { status: 403 })
      uid = null // token không hợp lệ / hết hạn -> coi như ẩn danh
    }
  }
  // Riêng tư chỉ dành cho người đăng nhập (ẩn danh không có chủ để giữ link) -> không lên cây, chỉ mở qua link bí mật.
  const isPrivate = !!uid && body.visibility === 'private'
  const status = uid ? (isPrivate ? 'private' : 'approved') : 'pending'

  // Ảnh: chỉ người đăng nhập (ẩn danh vào hàng chờ duyệt tay -> không nhận ảnh, đỡ rủi ro nội dung xấu)
  let webp: Awaited<ReturnType<typeof toWebp>> | null = null
  if (imageFile) {
    if (!uid) return NextResponse.json({ error: 'Đăng nhập để đính kèm ảnh nhé' }, { status: 401 })
    if (!getAdminBucket())
      return NextResponse.json({ error: 'Máy chủ chưa cấu hình nơi lưu ảnh (Firebase Storage)' }, { status: 503 })
    if (!imageFile.type.startsWith('image/') || imageFile.size > MAX_UPLOAD)
      return NextResponse.json({ error: 'Ảnh không hợp lệ hoặc lớn quá (tối đa 4 MB)' }, { status: 400 })
    try {
      webp = await toWebp(Buffer.from(await imageFile.arrayBuffer()), { max: WISH_IMG_PX, quality: WISH_IMG_Q })
    } catch {
      return NextResponse.json({ error: 'Không đọc được ảnh này, thử ảnh khác nhé' }, { status: 400 })
    }
  }
  const shareKey = isPrivate ? newShareKey() : null

  const db = getAdminDb()!
  await ensureNumbering(db)
  // Cấp số thứ tự #N trong transaction với bộ đếm meta/counters -> không trùng số.
  const ref = db.collection('wishes').doc()
  // tải ảnh TRƯỚC (cần id điều ước làm tên file); ghi doc hỏng thì xoá ảnh
  let image: (WishImage & { path: string }) | null = null
  if (webp) {
    const path = `wishes/${ref.id}.webp`
    try {
      image = { url: await uploadWebp(path, webp.buf), w: webp.w, h: webp.h, path }
    } catch (e) {
      console.error('[wishes] upload image failed', e)
      return NextResponse.json({ error: 'Chưa tải ảnh lên được, thử lại nhé' }, { status: 502 })
    }
  }
  let no: number
  try {
    no = await db.runTransaction(async (t) => {
      const c = await t.get(counterRef(db))
      const n = ((c.data()?.wishNo as number | undefined) ?? 0) + 1
      t.set(counterRef(db), { wishNo: n }, { merge: true })
      t.set(ref, {
        no: n,
        text: text.trim(),
        keywords: searchTokens(text),
        theme,
        ...(authorName ? { author: authorName } : {}),
        ...(uid ? { uid } : {}),
        ...(shareKey ? { shareKey } : {}),
        ...(image ? { image } : {}),
        status,
        commentCount: 0,
        reportCount: 0,
        createdAt: FieldValue.serverTimestamp(),
      })
      return n
    })
  } catch (e) {
    if (image) await deleteStorageFile(image.path)
    throw e
  }

  return NextResponse.json({ ok: true, id: ref.id, no, status, ...(shareKey ? { privateUrl: privateWishPath(shareKey) } : {}) })
}
