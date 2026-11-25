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

// POST { title, note?, wishIds[] }: tạo bộ từ 2–6 điều ước đang là "xàm xí".
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
  if (note.length > FC_NOTE_MAX) return deny(400, `Lời phê tối đa ${FC_NOTE_MAX} ký tự`)
  if (ids.length < FC_MIN || ids.length > FC_MAX) return deny(400, `Mỗi bộ gồm ${FC_MIN}–${FC_MAX} điều ước`)

  const db = getAdminDb()!
  const docs = await db.getAll(...ids.map((id) => db.collection('wishes').doc(id)))
  if (docs.some((d) => d.get('status') !== 'funny'))
    return deny(400, 'Chỉ gộp được điều ước đang ở mục Xàm xí')

  const ref = await db.collection('funnyCollections').add({
    title,
    note,
    wishIds: ids,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: auth.email ?? 'secret',
  })
  return NextResponse.json({ ok: true, id: ref.id })
}

// DELETE { id }: xoá bộ (các điều ước vẫn ở mục Xàm xí).
export async function DELETE(req: Request) {
  const auth = await checkAdmin(req)
  if (!auth.ok) return deny(auth.status, auth.error)
  if (!isAdminConfigured) return deny(503, 'Máy chủ chưa cấu hình Firebase Admin')
  const { id } = (await req.json().catch(() => ({}))) as { id?: unknown }
  if (typeof id !== 'string' || !id) return deny(400, 'bad request')
  await getAdminDb()!.collection('funnyCollections').doc(id).delete()
  return NextResponse.json({ ok: true })
}
