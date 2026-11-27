import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, isAdminConfigured } from '@/lib/firebase.admin'
import { rateLimit } from '@/lib/ratelimit'
import { AUTO_HIDE_REPORTS, isReportReason } from '@/lib/wishMeta'
import { viewerFromRequest } from '@/lib/wishServer'

import { revalidatePrivatePage, revalidateWishPage } from '@/lib/wishDetail'

export const runtime = 'nodejs'

function deny(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

// POST { wishId, commentId?, reason }: báo cáo điều ước / bình luận xấu — CHỈ người đăng nhập.
// Mỗi tài khoản báo 1 lần / nội dung (doc id = uid__wish__comment). Đủ AUTO_HIDE_REPORTS tài khoản
// khác nhau -> tự ẩn (điều ước về `pending` + flagged; bình luận hidden) chờ admin ở tab "Bị báo cáo".
export async function POST(req: Request) {
  if (!isAdminConfigured) return deny(503, 'Máy chủ chưa cấu hình lưu trữ (Firebase Admin)')
  const viewer = await viewerFromRequest(req, true)
  if (!viewer) return deny(401, 'Đăng nhập để báo cáo nhé')

  const body = (await req.json().catch(() => ({}))) as {
    wishId?: unknown
    commentId?: unknown
    reason?: unknown
  }
  const wishId = typeof body.wishId === 'string' ? body.wishId : ''
  const commentId = typeof body.commentId === 'string' && body.commentId ? body.commentId : null
  if (!wishId || !/^[\w-]{1,64}$/.test(wishId) || (commentId && !/^[\w-]{1,64}$/.test(commentId)))
    return deny(400, 'bad request')
  if (!isReportReason(body.reason)) return deny(400, 'Chọn lý do báo cáo')
  const reason = body.reason

  if (!rateLimit(`report:${viewer.uid}`, 20).ok)
    return deny(429, 'Bạn báo cáo hơi nhiều, thử lại sau nhé')

  const db = getAdminDb()!
  const wishRef = db.collection('wishes').doc(wishId)
  const targetRef = commentId ? wishRef.collection('comments').doc(commentId) : wishRef
  const reportRef = db.collection('reports').doc(`${viewer.uid}__${wishId}__${commentId ?? 'wish'}`)

  try {
    let hiddenNo: unknown = null
    let hiddenKey: unknown = null
    const result = await db.runTransaction(async (t) => {
      hiddenNo = null
      const [target, existing] = await Promise.all([t.get(targetRef), t.get(reportRef)])
      if (!target.exists) return 'not-found' as const
      if (target.get('uid') === viewer.uid) return 'own' as const
      if (existing.exists) return 'dup' as const

      const count = ((target.get('reportCount') as number | undefined) ?? 0) + 1
      t.set(reportRef, {
        type: commentId ? 'comment' : 'wish',
        wishId,
        commentId,
        uid: viewer.uid,
        reporter: viewer.name,
        reason,
        resolved: false,
        createdAt: FieldValue.serverTimestamp(),
      })
      const patch: Record<string, unknown> = { reportCount: count }
      if (count >= AUTO_HIDE_REPORTS) {
        if (commentId && !target.get('hidden')) {
          patch.hidden = true
          t.update(wishRef, { commentCount: FieldValue.increment(-1) })
        }
        const st = target.get('status')
        if (!commentId && (st === 'approved' || st === 'private')) {
          patch.status = 'pending'
          patch.flagged = true
          // nhớ chế độ cũ: admin "Bỏ qua" thì trả về đúng riêng tư/công khai
          patch.flaggedFrom = st
          hiddenNo = target.get('no')
          hiddenKey = target.get('shareKey')
        }
      }
      t.update(targetRef, patch)
      return 'ok' as const
    })
    revalidateWishPage(hiddenNo)
    revalidatePrivatePage(hiddenKey)
    if (result === 'not-found') return deny(404, 'Không tìm thấy nội dung')
    if (result === 'own') return deny(400, 'Bạn không thể báo cáo nội dung của chính mình.')
    return NextResponse.json({ ok: true, duplicate: result === 'dup' })
  } catch (e) {
    console.error('[reports] failed', e)
    return deny(500, 'Không gửi được báo cáo, thử lại nhé')
  }
}
