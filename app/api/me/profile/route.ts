import { NextResponse } from 'next/server'
import { getAdminAuth, getAdminBucket, getAdminDb, isAdminConfigured } from '@/lib/firebase.admin'
import { containsProfanity } from '@/lib/profanity'
import { rateLimit } from '@/lib/ratelimit'
import { NAME_MAX, NAME_MIN, cleanDisplayName } from '@/lib/wishMeta'
import { viewerFromRequest } from '@/lib/wishServer'
import { revalidateWishPage } from '@/lib/wishDetail'
import { MAX_UPLOAD, toWebp, uploadWebp } from '@/lib/imageServer'

export const runtime = 'nodejs'

/** Cạnh ảnh đại diện sau khi nén (vuông, WebP). 256px đủ nét ở mọi chỗ hiện (≤ 96px @2x). */
const AVATAR_PX = 256

function deny(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

/**
 * Cập nhật tên/ảnh đã lưu sẵn trên điều ước + bình luận của người này (tên/ảnh được chép vào doc lúc gửi).
 * Bình luận dùng collectionGroup('comments') where uid == — cần index đơn trường phạm vi collection group
 * (firestore.indexes.json > fieldOverrides). Thiếu index thì bỏ qua (chỉ bình luận cũ giữ tên cũ).
 */
async function propagate(uid: string, patch: { author?: string; photo?: string | null }) {
  const db = getAdminDb()!
  const wishNos: unknown[] = []
  const refs: FirebaseFirestore.DocumentReference[] = []
  const updates: Record<string, unknown>[] = []

  if (patch.author) {
    const snap = await db.collection('wishes').where('uid', '==', uid).limit(500).get()
    for (const d of snap.docs) {
      if (d.get('author') === patch.author) continue
      refs.push(d.ref)
      updates.push({ author: patch.author })
      wishNos.push(d.get('no'))
    }
  }
  try {
    const cs = await db.collectionGroup('comments').where('uid', '==', uid).limit(500).get()
    for (const d of cs.docs) {
      if (d.get('staff')) continue // bình luận của admin hiện tên ADMIN_DISPLAY_NAME, không đổi
      const u: Record<string, unknown> = {}
      if (patch.author) u.author = patch.author
      if (patch.photo !== undefined) u.photo = patch.photo ?? null
      refs.push(d.ref)
      updates.push(u)
    }
  } catch (e) {
    console.warn('[profile] bỏ qua cập nhật bình luận (thiếu index collection group comments.uid?)', e)
  }

  for (let i = 0; i < refs.length; i += 400) {
    const batch = db.batch()
    refs.slice(i, i + 400).forEach((r, j) => batch.update(r, updates[i + j]))
    await batch.commit()
  }
  wishNos.forEach(revalidateWishPage)
}

// PATCH { name }: đổi tên hiển thị (Firebase Auth displayName + tên trên điều ước/bình luận cũ).
export async function PATCH(req: Request) {
  if (!isAdminConfigured) return deny(503, 'Máy chủ chưa cấu hình lưu trữ (Firebase Admin)')
  const viewer = await viewerFromRequest(req, true)
  if (!viewer) return deny(401, 'Đăng nhập để đổi tên nhé')

  const body = (await req.json().catch(() => ({}))) as { name?: unknown }
  const name = cleanDisplayName(body.name)
  if (name.length < NAME_MIN || name.length > NAME_MAX)
    return deny(400, `Tên cần từ ${NAME_MIN} đến ${NAME_MAX} ký tự`)
  if (containsProfanity(name)) return deny(400, 'Tên có từ chưa phù hợp, đổi tên khác nhé')
  if (!rateLimit(`profile:${viewer.uid}`, 6, 10 * 60_000).ok)
    return deny(429, 'Bạn đổi hơi nhiều lần, nghỉ chút rồi thử lại nhé.')

  await getAdminAuth()!.updateUser(viewer.uid, { displayName: name })
  await propagate(viewer.uid, { author: name })
  return NextResponse.json({ ok: true, name })
}

// POST (body = ảnh, Content-Type image/*): ảnh đại diện mới -> nén WebP vuông 256px -> Firebase Storage.
export async function POST(req: Request) {
  if (!isAdminConfigured) return deny(503, 'Máy chủ chưa cấu hình lưu trữ (Firebase Admin)')
  const bucket = getAdminBucket()
  if (!bucket) return deny(503, 'Máy chủ chưa cấu hình nơi lưu ảnh (Firebase Storage)')
  const viewer = await viewerFromRequest(req, true)
  if (!viewer) return deny(401, 'Đăng nhập để đổi ảnh đại diện nhé')

  const type = req.headers.get('content-type') ?? ''
  if (!type.startsWith('image/')) return deny(400, 'Chỉ nhận file ảnh')
  if (Number(req.headers.get('content-length') ?? 0) > MAX_UPLOAD) return deny(413, 'Ảnh lớn quá (tối đa 4 MB)')
  if (!rateLimit(`avatar:${viewer.uid}`, 8, 10 * 60_000).ok)
    return deny(429, 'Bạn đổi ảnh hơi nhiều lần, nghỉ chút rồi thử lại nhé.')

  const input = Buffer.from(await req.arrayBuffer())
  if (input.length === 0 || input.length > MAX_UPLOAD) return deny(413, 'Ảnh lớn quá (tối đa 4 MB)')

  // Giải mã + nén lại ở SERVER (không tin file client): xoay theo EXIF, cắt vuông giữa, bỏ metadata (GPS…), WebP.
  let webp: Buffer
  try {
    webp = (await toWebp(input, { max: AVATAR_PX, square: true, quality: 78 })).buf
  } catch {
    return deny(400, 'Không đọc được ảnh này, thử ảnh khác nhé')
  }

  // Mỗi lần đổi là 1 file mới (URL mới -> không dính cache CDN), xoá file cũ sau khi thay xong.
  const dir = `avatars/${viewer.uid}/`
  const path = `${dir}${Date.now()}.webp`
  const url = await uploadWebp(path, webp)

  await getAdminAuth()!.updateUser(viewer.uid, { photoURL: url })
  await propagate(viewer.uid, { photo: url })

  try {
    const [old] = await bucket.getFiles({ prefix: dir })
    await Promise.all(old.filter((f) => f.name !== path).map((f) => f.delete({ ignoreNotFound: true })))
  } catch (e) {
    console.warn('[profile] chưa xoá được ảnh cũ', e)
  }
  return NextResponse.json({ ok: true, photo: url, bytes: webp.length })
}

// DELETE: bỏ ảnh tự tải lên -> quay về ảnh của Google (nếu có).
export async function DELETE(req: Request) {
  if (!isAdminConfigured) return deny(503, 'Máy chủ chưa cấu hình lưu trữ (Firebase Admin)')
  const viewer = await viewerFromRequest(req, true)
  if (!viewer) return deny(401, 'Đăng nhập để đổi ảnh đại diện nhé')
  if (!rateLimit(`avatar:${viewer.uid}`, 8, 10 * 60_000).ok)
    return deny(429, 'Bạn đổi ảnh hơi nhiều lần, nghỉ chút rồi thử lại nhé.')

  const fa = getAdminAuth()!
  const u = await fa.getUser(viewer.uid)
  const fallback = u.providerData.find((p) => p.photoURL)?.photoURL ?? null
  await fa.updateUser(viewer.uid, { photoURL: fallback })
  await propagate(viewer.uid, { photo: fallback })
  const bucket = getAdminBucket()
  if (bucket) {
    try {
      const [old] = await bucket.getFiles({ prefix: `avatars/${viewer.uid}/` })
      await Promise.all(old.map((f) => f.delete({ ignoreNotFound: true })))
    } catch (e) {
      console.warn('[profile] chưa xoá được ảnh cũ', e)
    }
  }
  return NextResponse.json({ ok: true, photo: fallback })
}
