import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, isAdminConfigured } from '@/lib/firebase.admin'
import { checkAdmin } from '@/lib/adminAuth'
import { ensureNumbering } from '@/lib/wishServer'

export const runtime = 'nodejs'

const PAGE_SIZE = 20
// 'funny' = "xàm xí": không duyệt lên cây nhưng vui -> hiện ở /xam-xi kèm lí do (funnyNote)
const STATUSES = ['pending', 'approved', 'rejected', 'funny'] as const
const NOTE_MAX = 300
type Status = (typeof STATUSES)[number]
const isStatus = (s: unknown): s is Status => STATUSES.includes(s as Status)

function deny(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

// GET ?status=pending|approved|rejected|funny|all&page= : danh sách điều ước cho admin.
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
  await ensureNumbering(db)
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
    const [all, pending, approved, rejected, funny] = countSnaps.map((c) => c.data().count)
    const counts = { all, pending, approved, rejected, funny }
    const total = status === 'all' ? all : counts[status]

    const items = snap.docs.map((d) => {
      const data = d.data()
      const ts = data.createdAt as { toMillis?: () => number } | undefined
      const rv = data.reviewedAt as { toMillis?: () => number } | undefined
      return {
        id: d.id,
        no: typeof data.no === 'number' ? data.no : null,
        text: String(data.text ?? ''),
        theme: String(data.theme ?? ''),
        author: data.author ? String(data.author) : null,
        status: String(data.status ?? ''),
        // Có uid = người đăng nhập Google/Facebook -> được tự duyệt lúc gửi.
        loggedIn: Boolean(data.uid),
        flagged: Boolean(data.flagged),
        reportCount: typeof data.reportCount === 'number' ? data.reportCount : 0,
        commentCount: typeof data.commentCount === 'number' ? data.commentCount : 0,
        reviewedBy: data.reviewedBy ? String(data.reviewedBy) : null,
        funnyNote: data.funnyNote ? String(data.funnyNote) : '',
        // thuộc 1 "bộ xàm xí" -> dùng lí do chung của bộ khi không có lí do riêng
        funnyGroup: data.funnyGroup ? String(data.funnyGroup) : null,
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

// PATCH { id, action: approve|reject|pending|funny, note? }: đổi trạng thái. 'funny' BẮT BUỘC note
// (lí do không duyệt, hiện công khai ở /xam-xi); đổi sang trạng thái khác thì xoá note.
export async function PATCH(req: Request) {
  const auth = await checkAdmin(req)
  if (!auth.ok) return deny(auth.status, auth.error)
  if (!isAdminConfigured) return deny(503, 'Máy chủ chưa cấu hình Firebase Admin')

  const { id, action, note } = (await req.json().catch(() => ({}))) as {
    id?: string
    action?: string
    note?: unknown
  }
  const next: Record<string, Status> = {
    approve: 'approved',
    reject: 'rejected',
    pending: 'pending',
    funny: 'funny',
  }
  if (!id || typeof id !== 'string' || !action || !next[action])
    return deny(400, 'bad request')
  const funnyNote = typeof note === 'string' ? note.trim().replace(/\s+/g, ' ') : ''
  if (action === 'funny' && (!funnyNote || funnyNote.length > NOTE_MAX))
    return deny(400, `Ghi lí do không duyệt (1–${NOTE_MAX} ký tự)`)

  const db = getAdminDb()!
  try {
    await db
      .collection('wishes')
      .doc(id)
      .update({
        status: next[action],
        flagged: false,
        reviewedAt: FieldValue.serverTimestamp(),
        reviewedBy: auth.email ?? 'secret',
        funnyNote: action === 'funny' ? funnyNote : FieldValue.delete(),
        // rời trạng thái xàm xí -> rời bộ luôn (đánh dấu lại 'funny' thì giữ bộ)
        ...(action === 'funny' ? {} : { funnyGroup: FieldValue.delete() }),
      })
  } catch {
    return deny(404, 'Không tìm thấy điều ước')
  }
  return NextResponse.json({ ok: true, status: next[action] })
}
