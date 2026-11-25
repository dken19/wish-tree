// Server-only: số thứ tự điều ước (#1, #2, …), xác thực người đăng nhập, đọc doc -> JSON.
import 'server-only'
import type { Firestore, DocumentSnapshot } from 'firebase-admin/firestore'
import { getAdminAuth } from './firebase.admin'
import { searchTokens } from './wishMeta'
import { isAdminEmail } from './adminAuth'

/** Doc đếm: { wishNo: số điều ước lớn nhất đã cấp }. */
export const counterRef = (db: Firestore) => db.doc('meta/counters')

const millis = (v: unknown) => {
  const ts = v as { toMillis?: () => number } | undefined
  return ts?.toMillis ? ts.toMillis() : 0
}

let numberingReady = false

/**
 * Đảm bảo hệ đánh số đã khởi tạo. Lần đầu (chưa có meta/counters): đánh số TẤT CẢ điều ước cũ
 * theo thứ tự gửi (createdAt, rồi id) + điền `keywords`, rồi đặt bộ đếm. Kết quả tất định nên
 * nhiều instance chạy song song cũng ghi ra cùng một số. Sau đó chỉ tốn 1 read / instance.
 */
export async function ensureNumbering(db: Firestore): Promise<void> {
  if (numberingReady) return
  const c = await counterRef(db).get()
  if (c.exists && typeof c.data()?.wishNo === 'number') {
    numberingReady = true
    return
  }
  const snap = await db.collection('wishes').get()
  const docs = [...snap.docs].sort(
    (a, b) => millis(a.get('createdAt')) - millis(b.get('createdAt')) || a.id.localeCompare(b.id)
  )
  let n = 0
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch()
    for (const d of docs.slice(i, i + 400)) {
      n += 1
      batch.update(d.ref, {
        no: n,
        keywords: searchTokens(String(d.get('text') ?? '')),
      })
    }
    await batch.commit()
  }
  await db.runTransaction(async (t) => {
    const cur = await t.get(counterRef(db))
    if (!cur.exists) t.set(counterRef(db), { wishNo: n })
  })
  numberingReady = true
}

/** admin = email đã xác minh nằm trong ADMIN_EMAILS (server tự quyết, không tin client). */
export type Viewer = { uid: string; name: string; photo: string | null; admin: boolean }

/** Đọc `Authorization: Bearer <Firebase ID token>`; null nếu không có / không hợp lệ. */
export async function viewerFromRequest(req: Request): Promise<Viewer | null> {
  const bearer = req.headers.get('authorization')
  const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : null
  if (!token) return null
  try {
    const d = await getAdminAuth()!.verifyIdToken(token)
    return {
      uid: d.uid,
      name: String(d.name || 'Người dùng').slice(0, 40),
      photo: typeof d.picture === 'string' ? d.picture : null,
      admin: isAdminEmail(d.email, d.email_verified),
    }
  } catch {
    return null
  }
}

/** Doc điều ước -> JSON công khai (KHÔNG trả uid). */
export function publicWish(d: DocumentSnapshot) {
  const data = d.data() ?? {}
  return {
    id: d.id,
    no: typeof data.no === 'number' ? data.no : null,
    text: String(data.text ?? ''),
    theme: String(data.theme ?? ''),
    author: data.author ? String(data.author) : null,
    createdAt: millis(data.createdAt),
    commentCount: typeof data.commentCount === 'number' ? data.commentCount : 0,
    // Gửi bởi người đăng nhập (có uid do server xác minh) -> thẻ lấp lánh. Chỉ trả boolean.
    verified: typeof data.uid === 'string' && data.uid.length > 0,
    // người viết tự đánh dấu "Đã đạt được" ở /tai-khoan
    achieved: data.progress === 'achieved',
  }
}
export type PublicWish = ReturnType<typeof publicWish>

export { millis }
