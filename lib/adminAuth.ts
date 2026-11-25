// Phân quyền trang /admin (server-only).
// Cách chính: đăng nhập Google -> client gửi Firebase ID token -> server verifyIdToken
// và kiểm tra email (đã xác minh) nằm trong danh sách ADMIN_EMAILS.
// Dự phòng: header x-admin-secret === ADMIN_SECRET (cách cũ, cho script/khẩn cấp).
import 'server-only'
import { getAdminAuth } from './firebase.admin'

// Mặc định có sẵn email chủ site; ghi đè/bổ sung bằng env ADMIN_EMAILS (phân tách dấu phẩy).
const DEFAULT_ADMINS = ['khuctruonghuy2000@gmail.com']

export function adminEmails(): string[] {
  const env = process.env.ADMIN_EMAILS
  const list = env ? env.split(',') : DEFAULT_ADMINS
  return list.map((e) => e.trim().toLowerCase()).filter(Boolean)
}

/** Email (đã xác minh) có thuộc danh sách admin không. */
export function isAdminEmail(email: string | null | undefined, verified: boolean | undefined): boolean {
  return Boolean(email && verified && adminEmails().includes(email.toLowerCase()))
}

/** Tên hiển thị khi admin bình luận (thay tên Google). Đổi bằng env ADMIN_DISPLAY_NAME. */
export function adminDisplayName(): string {
  return (process.env.ADMIN_DISPLAY_NAME || 'Người giữ cây').trim().slice(0, 40)
}

export type AdminCheck =
  | { ok: true; email: string | null }
  | { ok: false; status: 401 | 403; error: string }

export async function checkAdmin(req: Request): Promise<AdminCheck> {
  const secret = process.env.ADMIN_SECRET
  if (secret && req.headers.get('x-admin-secret') === secret)
    return { ok: true, email: null }

  const bearer = req.headers.get('authorization')
  const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : null
  if (!token) return { ok: false, status: 401, error: 'Chưa đăng nhập' }

  const auth = getAdminAuth()
  if (!auth) return { ok: false, status: 401, error: 'Máy chủ chưa cấu hình Firebase Admin' }

  try {
    const decoded = await auth.verifyIdToken(token)
    const email = decoded.email?.toLowerCase() ?? null
    // Bắt buộc email_verified để không ai tự đặt email giả qua provider khác.
    if (isAdminEmail(email, decoded.email_verified))
      return { ok: true, email }
    return { ok: false, status: 403, error: 'Tài khoản này không có quyền quản trị' }
  } catch {
    return { ok: false, status: 401, error: 'Phiên đăng nhập hết hạn, đăng nhập lại nhé' }
  }
}
