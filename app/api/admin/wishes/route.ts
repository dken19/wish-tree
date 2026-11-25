import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, isAdminConfigured } from '@/lib/firebase.admin'
import { checkAdmin } from '@/lib/adminAuth'

export const runtime = 'nodejs'

const PAGE_SIZE = 20
const STATUSES = ['pending', 'approved', 'rejected'] as const
type Status = (typeof STATUSES)[number]
const isStatus = (s: unknown): s is Status => STATUSES.includes(s as Status)

function deny(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

// GET ?status=pending|approved|rejected|all&page= : danh sách điều ước cho admin.
// Trả kèm số lượng từng trạng thái để hiện trên tab.
// Index cần: status+createdAt (đã có trong firestore.indexes.json); "all" chỉ orderBy createdAt.
export async function GET(req: Request) {
  const auth = await checkAdmin(req)
  if (!auth.ok) return deny(auth.status, auth.error)
  if (!isAdminConfigured) return deny(503, 'Máy chủ chưa cấu hình Firebase Admin')

  const url = new URL(req.url)
  const statusParam = url.searchParams.get('status') ?? 'pending'
  const status: Status | 'all' = isStatus(statusParam) ? statusParam : 'all'
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)

  const db = getAdminDb()!
  const col = db.collection('wishes')
  const base: FirebaseFirestore.Query = status === 'all' ? col : col.where('status', '==', status)

  try {
    const [countSnaps, snap] = await Promise.all([
      Promise.all([
        col.count().get(),
        ...STATUSES.map((s) => col.where('status', '==', s).count().get()),
      ]),
      base
        .orderBy('createdAt', 'desc')
        .offset((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .get(),
    ])
    const [all, pending, approved, rejected] = countSnaps.map((c) => c.data().count)
    const counts = { all, pending, approved, rejected }
    const total = status === 'all' ? all : counts[status]

    const items = snap.docs.map((d) => {
      const data = d.data()
      const ts = data.createdAt as { toMillis?: () => number } | undefined
      const rv = data.reviewedAt as { toMillis?: () => number } | undefined
      return {
        id: d.id,
        text: String(data.text ?? ''),
        theme: String(data.theme ?? ''),
        author: data.author ? String(data.author) : null,
        status: String(data.status ?? ''),
        // Có uid = người đăng nhập Google/Facebook -> được tự duyệt lúc gửi.
        loggedIn: Boolean(data.uid),
        reviewedBy: data.reviewedBy ? String(data.reviewedBy) : null,
        createdAt: ts?.toMillis ? ts.toMillis() : 0,
        reviewedAt: rv?.toMillis ? rv.toMillis() : 0,
      }
    })

    return NextResponse.json({
      items,
      counts,
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    })
  } catch (e) {
    console.error('[admin/wishes] query failed', e)
    const needsIndex = (e as { code?: number })?.code === 9
    return deny(
      needsIndex ? 503 : 500,
      needsIndex
        ? 'Thiếu Firestore index (xem firestore.indexes.json / link trong log server).'
        : 'Không tải được danh sách.'
    )
  }
}

// PATCH { id, action: approve|reject|pending }: đổi trạng thái (duyệt, bỏ, hoặc đưa về chờ).
export async function PATCH(req: Request) {
  const auth = await checkAdmin(req)
  if (!auth.ok) return deny(auth.status, auth.error)
  if (!isAdminConfigured) return deny(503, 'Máy chủ chưa cấu hình Firebase Admin')

  const { id, action } = (await req.json().catch(() => ({}))) as {
    id?: string
    action?: string
  }
  const next: Record<string, Status> = { approve: 'approved', reject: 'rejected', pending: 'pending' }
  if (!id || typeof id !== 'string' || !action || !next[action])
    return deny(400, 'bad request')

  const db = getAdminDb()!
  try {
    await db
      .collection('wishes')
      .doc(id)
      .update({
        status: next[action],
        reviewedAt: FieldValue.serverTimestamp(),
        reviewedBy: auth.email ?? 'secret',
      })
  } catch {
    return deny(404, 'Không tìm thấy điều ước')
  }
  return NextResponse.json({ ok: true, status: next[action] })
}
