import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, isAdminConfigured } from '@/lib/firebase.admin'
import { rateLimit } from '@/lib/ratelimit'
import { isProgress } from '@/lib/wishMeta'
import { millis, viewerFromRequest } from '@/lib/wishServer'
import { isWishSkin } from '@/lib/wishSkins'
import { revalidateWishPage } from '@/lib/wishDetail'
import type { DocumentSnapshot } from 'firebase-admin/firestore'

export const runtime = 'nodejs'

/** Số điều ước tối đa trả về cho 1 tài khoản (đủ dư cho người dùng thật). */
const MAX_OWN = 500

function deny(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

function ownItem(d: DocumentSnapshot) {
  const x = d.data() ?? {}
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
    skin: isWishSkin(x.skin) ? x.skin : null,
    commentCount: typeof x.commentCount === 'number' ? x.commentCount : 0,
    createdAt: millis(x.createdAt),
  }
}

// GET: mọi điều ước của CHÍNH người đăng nhập (mọi trạng thái duyệt), mới -> cũ.
// where('uid') đơn trường -> không cần composite index; sort trong bộ nhớ.
// GET ?id=… : chỉ 1 điều ước đó nếu là của mình (trang chi tiết dùng để hiện bảng chỉnh), không thì items rỗng.
export async function GET(req: Request) {
  if (!isAdminConfigured) return NextResponse.json({ items: [], configured: false })
  const viewer = await viewerFromRequest(req)
  if (!viewer) return deny(401, 'Đăng nhập để xem điều ước của bạn nhé')

  const col = getAdminDb()!.collection('wishes')
  const one = new URL(req.url).searchParams.get('id')
  if (one) {
    if (one.includes('/')) return NextResponse.json({ items: [], configured: true })
    const d = await col.doc(one).get()
    const mine = d.exists && d.get('uid') === viewer.uid
    return NextResponse.json({ items: mine ? [ownItem(d)] : [], configured: true })
  }

  const snap = await col.where('uid', '==', viewer.uid).limit(MAX_OWN).get()
  const items = snap.docs.map(ownItem).sort((a, b) => b.createdAt - a.createdAt)
  return NextResponse.json({ items, configured: true })
}

// PATCH { id, progress?: 'trying'|'achieved', skin?: WishSkinKey } — CHỈ chủ điều ước (uid khớp).
// progress = tiến độ tự đánh dấu; skin = giao diện trang chi tiết /dieu-uoc/[no].
export async function PATCH(req: Request) {
  if (!isAdminConfigured) return deny(503, 'Máy chủ chưa cấu hình lưu trữ (Firebase Admin)')
  const viewer = await viewerFromRequest(req)
  if (!viewer) return deny(401, 'Đăng nhập để cập nhật điều ước nhé')

  const body = (await req.json().catch(() => ({}))) as { id?: unknown; progress?: unknown; skin?: unknown }
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id || id.includes('/')) return deny(400, 'Thiếu điều ước')
  const hasProgress = body.progress !== undefined
  const hasSkin = body.skin !== undefined
  if (!hasProgress && !hasSkin) return deny(400, 'Không có gì để cập nhật')
  if (hasProgress && !isProgress(body.progress)) return deny(400, 'Trạng thái không hợp lệ')
  if (hasSkin && !isWishSkin(body.skin)) return deny(400, 'Giao diện không hợp lệ')
  if (!rateLimit(`progress:${viewer.uid}`, 40).ok)
    return deny(429, 'Bạn đổi hơi nhanh, nghỉ chút rồi thử lại nhé.')

  const ref = getAdminDb()!.collection('wishes').doc(id)
  const doc = await ref.get()
  // Không lộ điều ước của người khác: không phải của mình cũng trả 404
  if (!doc.exists || doc.get('uid') !== viewer.uid) return deny(404, 'Không tìm thấy điều ước')

  const patch: Record<string, unknown> = {}
  const achieved = body.progress === 'achieved'
  if (hasProgress) {
    patch.progress = body.progress
    patch.achievedAt = achieved ? FieldValue.serverTimestamp() : FieldValue.delete()
  }
  if (hasSkin) patch.skin = body.skin
  await ref.update(patch)
  revalidateWishPage(doc.get('no'))
  return NextResponse.json({
    ok: true,
    ...(hasProgress ? { progress: body.progress, achievedAt: achieved ? Date.now() : 0 } : {}),
    ...(hasSkin ? { skin: body.skin } : {}),
  })
}
