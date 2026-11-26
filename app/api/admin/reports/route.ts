import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, isAdminConfigured } from '@/lib/firebase.admin'
import { checkAdmin } from '@/lib/adminAuth'
import { millis } from '@/lib/wishServer'

import { revalidateWishPage } from '@/lib/wishDetail'

export const runtime = 'nodejs'

const SCAN = 300

function deny(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

// GET: báo cáo CHƯA xử lý, gộp theo nội dung bị báo (điều ước hoặc bình luận), nhiều lượt nhất trước.
// Chỉ orderBy createdAt (index đơn) rồi lọc `resolved` trong bộ nhớ -> khỏi composite index.
export async function GET(req: Request) {
  const auth = await checkAdmin(req)
  if (!auth.ok) return deny(auth.status, auth.error)
  if (!isAdminConfigured) return deny(503, 'Máy chủ chưa cấu hình Firebase Admin')

  const db = getAdminDb()!
  const snap = await db.collection('reports').orderBy('createdAt', 'desc').limit(SCAN).get()

  type Group = {
    key: string
    wishId: string
    commentId: string | null
    count: number
    reasons: Record<string, number>
    reporters: string[]
    lastAt: number
  }
  const groups = new Map<string, Group>()
  for (const d of snap.docs) {
    if (d.get('resolved')) continue
    const wishId = String(d.get('wishId'))
    const commentId = d.get('commentId') ? String(d.get('commentId')) : null
    const key = `${wishId}/${commentId ?? ''}`
    const g =
      groups.get(key) ??
      ({ key, wishId, commentId, count: 0, reasons: {}, reporters: [], lastAt: 0 } as Group)
    g.count += 1
    const r = String(d.get('reason') ?? 'other')
    g.reasons[r] = (g.reasons[r] ?? 0) + 1
    if (g.reporters.length < 5) g.reporters.push(String(d.get('reporter') ?? ''))
    g.lastAt = Math.max(g.lastAt, millis(d.get('createdAt')))
    groups.set(key, g)
  }

  const list = [...groups.values()].sort((a, b) => b.count - a.count || b.lastAt - a.lastAt)
  const refs = list.map((g) => {
    const w = db.collection('wishes').doc(g.wishId)
    return g.commentId ? w.collection('comments').doc(g.commentId) : w
  })
  const wishRefs = list.map((g) => db.collection('wishes').doc(g.wishId))
  const [targets, wishes] = refs.length
    ? await Promise.all([db.getAll(...refs), db.getAll(...wishRefs)])
    : [[], []]

  const items = list.map((g, i) => {
    const t = targets[i]
    const w = wishes[i]
    return {
      ...g,
      exists: t.exists,
      text: String(t.get('text') ?? ''),
      author: t.get('author') ? String(t.get('author')) : null,
      // điều ước: status; bình luận: hidden
      status: g.commentId ? (t.get('hidden') ? 'hidden' : 'visible') : String(t.get('status') ?? ''),
      wishNo: typeof w.get('no') === 'number' ? (w.get('no') as number) : null,
      wishText: g.commentId ? String(w.get('text') ?? '') : null,
    }
  })
  return NextResponse.json({ items })
}

// PATCH { wishId, commentId?, action: 'hide'|'dismiss' }
// - hide: gỡ điều ước (rejected) / ẩn bình luận; đánh dấu các báo cáo đã xử lý.
// - dismiss: báo cáo không đúng -> hiện lại (điều ước bị TỰ ẩn thì về approved), reset reportCount.
export async function PATCH(req: Request) {
  const auth = await checkAdmin(req)
  if (!auth.ok) return deny(auth.status, auth.error)
  if (!isAdminConfigured) return deny(503, 'Máy chủ chưa cấu hình Firebase Admin')

  const body = (await req.json().catch(() => ({}))) as {
    wishId?: unknown
    commentId?: unknown
    action?: unknown
  }
  const wishId = typeof body.wishId === 'string' ? body.wishId : ''
  const commentId = typeof body.commentId === 'string' && body.commentId ? body.commentId : null
  const action = body.action
  if (!wishId || (action !== 'hide' && action !== 'dismiss')) return deny(400, 'bad request')

  const db = getAdminDb()!
  const wishRef = db.collection('wishes').doc(wishId)
  const targetRef = commentId ? wishRef.collection('comments').doc(commentId) : wishRef
  const by = auth.email ?? 'secret'

  try {
    let wishNo: unknown = null
    await db.runTransaction(async (t) => {
      const target = await t.get(targetRef)
      if (!target.exists) return
      if (!commentId) wishNo = target.get('no')
      if (commentId) {
        const wasHidden = Boolean(target.get('hidden'))
        const hide = action === 'hide'
        t.update(targetRef, { hidden: hide, reportCount: 0, reviewedBy: by })
        if (wasHidden !== hide)
          t.update(wishRef, { commentCount: FieldValue.increment(hide ? -1 : 1) })
      } else if (action === 'hide') {
        t.update(targetRef, {
          status: 'rejected',
          flagged: false,
          reportCount: 0,
          reviewedBy: by,
          reviewedAt: FieldValue.serverTimestamp(),
        })
      } else {
        t.update(targetRef, {
          ...(target.get('flagged') ? { status: 'approved' } : {}),
          flagged: false,
          reportCount: 0,
          reviewedBy: by,
          reviewedAt: FieldValue.serverTimestamp(),
        })
      }
    })

    // Đánh dấu mọi báo cáo của nội dung này đã xử lý (2 điều kiện bằng -> không cần composite index)
    const reps = await db
      .collection('reports')
      .where('wishId', '==', wishId)
      .where('commentId', '==', commentId)
      .get()
    const batch = db.batch()
    reps.docs.forEach((d) => batch.update(d.ref, { resolved: true, resolution: action, resolvedBy: by }))
    if (reps.size) await batch.commit()
    revalidateWishPage(wishNo)
  } catch (e) {
    console.error('[admin/reports] failed', e)
    return deny(500, 'Không cập nhật được')
  }
  return NextResponse.json({ ok: true })
}
