import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, isAdminConfigured } from '@/lib/firebase.admin'
import { checkAdmin } from '@/lib/adminAuth'
import { FC_MAX, FC_MIN, FC_NOTE_MAX, FC_TITLE_MAX, loadCollections } from '@/lib/funnyCollections'

export const runtime = 'nodejs'

function deny(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}
const clean = (v: unknown) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '')

// GET: mọi bộ (kể cả bộ đã rỗng) cho admin.
export async function GET(req: Request) {
  const auth = await checkAdmin(req)
  if (!auth.ok) return deny(auth.status, auth.error)
  if (!isAdminConfigured) return deny(503, 'Máy chủ chưa cấu hình Firebase Admin')
  return NextResponse.json({ items: await loadCollections(getAdminDb()!, 100) })
}

// POST { title, note, wishIds[] }: tạo bộ 2–6 điều ước, `note` = LÍ DO CHUNG (bắt buộc) cho cả bộ.
// Tờ chưa ở mục Xàm xí (chờ duyệt / đã bỏ / đã duyệt) được chuyển sang 'funny' luôn; lí do riêng có sẵn thì giữ.
export async function POST(req: Request) {
  const auth = await checkAdmin(req)
  if (!auth.ok) return deny(auth.status, auth.error)
  if (!isAdminConfigured) return deny(503, 'Máy chủ chưa cấu hình Firebase Admin')

  const body = (await req.json().catch(() => ({}))) as { title?: unknown; note?: unknown; wishIds?: unknown }
  const title = clean(body.title)
  const note = clean(body.note)
  const ids = Array.isArray(body.wishIds)
    ? [...new Set(body.wishIds.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length < 200))]
    : []
  if (!title || title.length > FC_TITLE_MAX) return deny(400, `Đặt tên bộ (1–${FC_TITLE_MAX} ký tự)`)
  if (!note || note.length > FC_NOTE_MAX) return deny(400, `Ghi lí do chung của bộ (1–${FC_NOTE_MAX} ký tự)`)
  if (ids.length < FC_MIN || ids.length > FC_MAX) return deny(400, `Mỗi bộ gồm ${FC_MIN}–${FC_MAX} điều ước`)

  const db = getAdminDb()!
  const docs = await db.getAll(...ids.map((id) => db.collection('wishes').doc(id)))
  if (docs.some((d) => !d.exists)) return deny(404, 'Có điều ước không còn tồn tại')

  const by = auth.email ?? 'secret'
  const ref = db.collection('funnyCollections').doc()
  const batch = db.batch()
  batch.set(ref, { title, note, wishIds: ids, createdAt: FieldValue.serverTimestamp(), createdBy: by })
  for (const d of docs) {
    const moved = d.get('status') !== 'funny'
    batch.update(d.ref, {
      funnyGroup: ref.id,
      ...(moved
        ? { status: 'funny', flagged: false, reviewedAt: FieldValue.serverTimestamp(), reviewedBy: by }
        : {}),
    })
  }
  await batch.commit()
  return NextResponse.json({ ok: true, id: ref.id })
}

// DELETE { id }: xoá bộ. Các tờ vẫn ở mục Xàm xí; tờ nào không có lí do riêng thì nhận lí do chung của bộ
// làm lí do riêng (không tờ nào bị mất lí do).
export async function DELETE(req: Request) {
  const auth = await checkAdmin(req)
  if (!auth.ok) return deny(auth.status, auth.error)
  if (!isAdminConfigured) return deny(503, 'Máy chủ chưa cấu hình Firebase Admin')
  const { id } = (await req.json().catch(() => ({}))) as { id?: unknown }
  if (typeof id !== 'string' || !id) return deny(400, 'bad request')
  const db = getAdminDb()!
  const ref = db.collection('funnyCollections').doc(id)
  const snap = await ref.get()
  if (!snap.exists) return NextResponse.json({ ok: true })
  const note = String(snap.get('note') ?? '')
  const wishIds = (snap.get('wishIds') as string[] | undefined) ?? []
  const batch = db.batch()
  if (wishIds.length) {
    const docs = await db.getAll(...wishIds.map((w) => db.collection('wishes').doc(w)))
    for (const d of docs) {
      if (!d.exists || d.get('funnyGroup') !== id) continue
      batch.update(d.ref, {
        funnyGroup: FieldValue.delete(),
        ...(!d.get('funnyNote') && note ? { funnyNote: note } : {}),
      })
    }
  }
  batch.delete(ref)
  await batch.commit()
  return NextResponse.json({ ok: true })
}
