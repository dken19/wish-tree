import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, isAdminConfigured } from '@/lib/firebase.admin'
import { validateComment } from '@/lib/profanity'
import { rateLimit } from '@/lib/ratelimit'
import { millis, viewerFromRequest } from '@/lib/wishServer'

export const runtime = 'nodejs'

const MAX_LIST = 200

function deny(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

// GET: bình luận (chưa bị ẩn) của 1 điều ước ĐÃ ĐĂNG, cũ -> mới. Ai cũng đọc được.
// Gửi kèm Bearer token (không bắt buộc) để biết bình luận nào là của mình (`mine`).
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!isAdminConfigured) return NextResponse.json({ items: [] })
  const db = getAdminDb()!
  const wish = await db.collection('wishes').doc(id).get()
  if (!wish.exists || wish.get('status') !== 'approved') return deny(404, 'Không tìm thấy điều ước')

  const viewer = await viewerFromRequest(req)
  const snap = await wish.ref.collection('comments').orderBy('createdAt', 'asc').limit(MAX_LIST).get()
  const items = snap.docs
    .filter((d) => !d.get('hidden'))
    .map((d) => ({
      id: d.id,
      text: String(d.get('text') ?? ''),
      author: String(d.get('author') ?? 'Người dùng'),
      photo: d.get('photo') ? String(d.get('photo')) : null,
      createdAt: millis(d.get('createdAt')),
      mine: Boolean(viewer && viewer.uid === d.get('uid')),
    }))
  return NextResponse.json({ items })
}

// POST { text }: bình luận — CHỈ người đăng nhập (verifyIdToken), lọc từ + rate-limit theo uid.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!isAdminConfigured) return deny(503, 'Máy chủ chưa cấu hình lưu trữ (Firebase Admin)')

  const viewer = await viewerFromRequest(req)
  if (!viewer) return deny(401, 'Đăng nhập để bình luận nhé')

  const body = (await req.json().catch(() => ({}))) as { text?: unknown }
  const text = String(body.text ?? '').trim()
  const v = validateComment(text)
  if (!v.ok) return deny(400, v.reason)

  if (!rateLimit(`comment:${viewer.uid}`, 10).ok)
    return deny(429, 'Bạn bình luận hơi nhanh, nghỉ chút rồi quay lại nhé.')

  const db = getAdminDb()!
  const wishRef = db.collection('wishes').doc(id)
  const ref = wishRef.collection('comments').doc()
  try {
    await db.runTransaction(async (t) => {
      const w = await t.get(wishRef)
      if (!w.exists || w.get('status') !== 'approved') throw new Error('not-found')
      t.set(ref, {
        text,
        uid: viewer.uid,
        author: viewer.name,
        ...(viewer.photo ? { photo: viewer.photo } : {}),
        hidden: false,
        reportCount: 0,
        createdAt: FieldValue.serverTimestamp(),
      })
      t.update(wishRef, { commentCount: FieldValue.increment(1) })
    })
  } catch {
    return deny(404, 'Không tìm thấy điều ước')
  }
  return NextResponse.json({
    ok: true,
    item: { id: ref.id, text, author: viewer.name, photo: viewer.photo, createdAt: Date.now(), mine: true },
  })
}
