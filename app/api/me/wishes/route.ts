import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, isAdminConfigured } from '@/lib/firebase.admin'
import { rateLimit } from '@/lib/ratelimit'
import { isProgress } from '@/lib/wishMeta'
import { millis, viewerFromRequest } from '@/lib/wishServer'

export const runtime = 'nodejs'

/** Số điều ước tối đa trả về cho 1 tài khoản (đủ dư cho người dùng thật). */
const MAX_OWN = 500

function deny(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

// GET: mọi điều ước của CHÍNH người đăng nhập (mọi trạng thái duyệt), mới -> cũ.
// where('uid') đơn trường -> không cần composite index; sort trong bộ nhớ.
export async function GET(req: Request) {
  if (!isAdminConfigured) return NextResponse.json({ items: [], configured: false })
  const viewer = await viewerFromRequest(req)
  if (!viewer) return deny(401, 'Đăng nhập để xem điều ước của bạn nhé')

  const snap = await getAdminDb()!.collection('wishes').where('uid', '==', viewer.uid).limit(MAX_OWN).get()
  const items = snap.docs
    .map((d) => {
      const x = d.data()
      return {
        id: d.id,
        no: typeof x.no === 'number' ? x.no : null,
        text: String(x.text ?? ''),
        theme: String(x.theme ?? ''),
        // trạng thái duyệt (bị báo cáo tự ẩn -> 'pending' + flagged)
        status: String(x.status ?? 'pending'),
        flagged: Boolean(x.flagged),
        progress: isProgress(x.progress) ? x.progress : 'trying',
        achievedAt: millis(x.achievedAt),
        commentCount: typeof x.commentCount === 'number' ? x.commentCount : 0,
        createdAt: millis(x.createdAt),
      }
    })
    .sort((a, b) => b.createdAt - a.createdAt)
  return NextResponse.json({ items, configured: true })
}

// PATCH { id, progress: 'trying'|'achieved' }: tự đánh dấu tiến độ — CHỈ chủ điều ước (uid khớp).
export async function PATCH(req: Request) {
  if (!isAdminConfigured) return deny(503, 'Máy chủ chưa cấu hình lưu trữ (Firebase Admin)')
  const viewer = await viewerFromRequest(req)
  if (!viewer) return deny(401, 'Đăng nhập để cập nhật điều ước nhé')

  const body = (await req.json().catch(() => ({}))) as { id?: unknown; progress?: unknown }
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id || id.includes('/')) return deny(400, 'Thiếu điều ước')
  if (!isProgress(body.progress)) return deny(400, 'Trạng thái không hợp lệ')
  if (!rateLimit(`progress:${viewer.uid}`, 30).ok)
    return deny(429, 'Bạn đổi hơi nhanh, nghỉ chút rồi thử lại nhé.')

  const ref = getAdminDb()!.collection('wishes').doc(id)
  const doc = await ref.get()
  // Không lộ điều ước của người khác: không phải của mình cũng trả 404
  if (!doc.exists || doc.get('uid') !== viewer.uid) return deny(404, 'Không tìm thấy điều ước')

  const achieved = body.progress === 'achieved'
  await ref.update({
    progress: body.progress,
    achievedAt: achieved ? FieldValue.serverTimestamp() : FieldValue.delete(),
  })
  return NextResponse.json({ ok: true, progress: body.progress, achievedAt: achieved ? Date.now() : 0 })
}
