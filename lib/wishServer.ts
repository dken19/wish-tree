// Server-only: số thứ tự điều ước (#1, #2, …), xác thực người đăng nhập, đọc doc -> JSON.
import 'server-only'
import { randomBytes } from 'node:crypto'
import type { Firestore, DocumentSnapshot } from 'firebase-admin/firestore'
import { getAdminAuth } from './firebase.admin'
import { readWishImage, searchTokens } from './wishMeta'
import { isAdminEmail } from './adminAuth'
import { isWishSkin } from './wishSkins'
import { isWishFrame } from './wishFrames'
import { readCounts } from './reactions'

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

/**
 * Đọc `Authorization: Bearer <Firebase ID token>`; null nếu không có / không hợp lệ.
 * `strict` (dùng ở MỌI đường GHI): kiểm tra thêm tài khoản bị admin khoá (disabled) / thu hồi phiên
 * -> verifyIdToken(token, true) tốn thêm 1 lượt gọi Auth nên đường đọc không bật.
 */
export async function viewerFromRequest(req: Request, strict = false): Promise<Viewer | null> {
  const bearer = req.headers.get('authorization')
  const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : null
  if (!token) return null
  try {
    const d = await getAdminAuth()!.verifyIdToken(token, strict)
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
    // ảnh đính kèm (người đăng nhập, WebP do server nén) — KHÔNG trả `path` trong Storage
    image: readWishImage(data.image),
    theme: String(data.theme ?? ''),
    author: data.author ? String(data.author) : null,
    createdAt: millis(data.createdAt),
    commentCount: typeof data.commentCount === 'number' ? data.commentCount : 0,
    // Gửi bởi người đăng nhập (có uid do server xác minh) -> thẻ lấp lánh. Chỉ trả boolean.
    verified: typeof data.uid === 'string' && data.uid.length > 0,
    // người viết tự đánh dấu "Đã đạt được" ở /tai-khoan
    achieved: data.progress === 'achieved',
    // giao diện trang chi tiết do chủ nhân chọn — chỉ ước của người đăng nhập mới có
    // số cảm xúc (tim / cỏ bốn lá / sao) — chỉ số đếm, không lộ ai thả
    reactions: readCounts(data.reactions),
    skin: typeof data.uid === 'string' && data.uid && isWishSkin(data.skin) ? data.skin : null,
    // khung trang trí do chủ nhân chọn (lib/wishFrames) — như skin, chỉ ước của người đăng nhập
    frame: typeof data.uid === 'string' && data.uid && isWishFrame(data.frame) ? data.frame : null,
  }
}
export type PublicWish = ReturnType<typeof publicWish>

export { millis }

/** Khoá link bí mật cho ước riêng tư: 16 byte ngẫu nhiên -> 22 ký tự base64url (không đoán được như #số). */
export const newShareKey = () => randomBytes(16).toString('base64url')
