import { NextResponse } from 'next/server'
import { getAdminDb, isAdminConfigured } from '@/lib/firebase.admin'

export const runtime = 'nodejs'

function authed(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return false
  return req.headers.get('x-admin-secret') === secret
}

// GET: liệt kê điều ước đang chờ duyệt
export async function GET(req: Request) {
  if (!authed(req))
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!isAdminConfigured)
    return NextResponse.json({ error: 'admin not configured' }, { status: 503 })

  const db = getAdminDb()!
  const snap = await db
    .collection('wishes')
    .where('status', '==', 'pending')
    .limit(100)
    .get()
  const items = snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      text: data.text,
      theme: data.theme,
      author: data.author ?? null,
    }
  })
  return NextResponse.json({ items })
}

// PATCH: duyệt / từ chối một điều ước
export async function PATCH(req: Request) {
  if (!authed(req))
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!isAdminConfigured)
    return NextResponse.json({ error: 'admin not configured' }, { status: 503 })

  const { id, action } = (await req.json().catch(() => ({}))) as {
    id?: string
    action?: 'approve' | 'reject'
  }
  if (!id || (action !== 'approve' && action !== 'reject'))
    return NextResponse.json({ error: 'bad request' }, { status: 400 })

  const db = getAdminDb()!
  await db
    .collection('wishes')
    .doc(id)
    .update({ status: action === 'approve' ? 'approved' : 'rejected' })
  return NextResponse.json({ ok: true })
}
