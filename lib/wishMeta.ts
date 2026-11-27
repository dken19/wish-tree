// Tiện ích dùng chung client + server cho điều ước: số thứ tự, giờ gửi, từ khoá tìm kiếm,
// lý do báo cáo. Thuần JS, không phụ thuộc Firebase.

/** "#888" */
export const formatNo = (no?: number | null) => (no ? `#${no}` : '')

/** "25/11/2026 16:14" theo giờ Việt Nam (ổn định dù máy người xem ở múi giờ khác). */
export function formatWishTime(ms?: number | null): string {
  if (!ms) return ''
  return new Date(ms).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** "25/11/2026 16:14" -> ["25/11/2026", "16:14"] (giờ VN) — cho cuống vé. */
export function splitWishTime(ms?: number | null): [string, string] {
  const t = formatWishTime(ms)
  if (!t) return ['', '']
  const parts = t.split(/,?\s+/)
  // vi-VN có thể trả "16:14 25/11/2026" hoặc "25/11/2026, 16:14"
  return [parts.find((x) => x.includes('/')) ?? '', parts.find((x) => x.includes(':')) ?? '']
}

/** Bỏ dấu tiếng Việt + chữ thường: "Điểm Toán" -> "diem toan". */
export function foldVi(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
}

/**
 * Từ khoá tìm kiếm (đã bỏ dấu, duy nhất, ≥2 ký tự) — lưu vào field `keywords` của điều ước
 * để /api/wishes/list tìm bằng `array-contains` (Firestore không có full-text search).
 */
export function searchTokens(text: string, max = 40): string[] {
  const out = new Set<string>()
  for (const t of foldVi(text).split(/[^a-z0-9]+/)) {
    if (t.length >= 2) out.add(t)
    if (out.size >= max) break
  }
  return [...out]
}

/** "#888" / "888" -> 888; còn lại null. */
export function parseNoQuery(q: string): number | null {
  const m = q.trim().match(/^#?(\d{1,7})$/)
  return m ? Number(m[1]) : null
}

export const REPORT_REASONS = {
  offensive: 'Ngôn từ xúc phạm, thô tục',
  spam: 'Spam / quảng cáo',
  personal: 'Lộ thông tin cá nhân người khác',
  other: 'Lý do khác',
} as const
export type ReportReason = keyof typeof REPORT_REASONS
export const isReportReason = (r: unknown): r is ReportReason =>
  typeof r === 'string' && r in REPORT_REASONS

/** Số lượt báo cáo (từ các tài khoản KHÁC nhau) để tự ẩn nội dung chờ admin xem. */
export const AUTO_HIDE_REPORTS = 3

/** Tiến độ điều ước do CHÍNH người viết (đăng nhập) tự đánh dấu ở /tai-khoan. Thiếu trường = 'trying'. */
export type WishProgress = 'trying' | 'achieved'
export const PROGRESS_LABEL: Record<WishProgress, string> = {
  trying: 'Đang cố gắng',
  achieved: 'Đã đạt được',
}
export const isProgress = (v: unknown): v is WishProgress => v === 'trying' || v === 'achieved'

/**
 * Chế độ hiển thị do CHỦ điều ước chọn. Lưu bằng `status`:
 * - 'approved' = công khai (lên cây, /dieu-uoc, tìm kiếm, sitemap)
 * - 'private'  = riêng tư: KHÔNG hiện ở đâu cả, chỉ mở được qua link bí mật /dieu-uoc/rieng/<shareKey>
 * Dùng status (thay vì field riêng) để mọi truy vấn/rules `status == 'approved'` sẵn có tự loại ước riêng tư.
 */
export type WishVisibility = 'public' | 'private'
export const isVisibility = (v: unknown): v is WishVisibility => v === 'public' || v === 'private'
/** Ước "đang sống" (đọc/bình luận/thả cảm xúc được): công khai, hoặc riêng tư qua link. */
export const isLiveStatus = (s: unknown) => s === 'approved' || s === 'private'
/** Link chia sẻ của ước riêng tư (đường dẫn tương đối). */
export const privateWishPath = (key: string) => `/dieu-uoc/rieng/${key}`
/** shareKey hợp lệ: 22 ký tự base64url (16 byte ngẫu nhiên). */
export const isShareKey = (k: unknown): k is string => typeof k === 'string' && /^[A-Za-z0-9_-]{22}$/.test(k)

/** Tên hiển thị người dùng tự đặt: 2–40 ký tự sau khi gọn khoảng trắng. */
export const NAME_MIN = 2
export const NAME_MAX = 40
export const cleanDisplayName = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim()

/** Ảnh đính kèm điều ước (chỉ người đăng nhập, 1 ảnh, server nén WebP ≤1280px). */
export type WishImage = { url: string; w: number; h: number }
/** Đọc field `image` từ doc -> chỉ nhận URL Firebase Storage do server ghi; sai dạng -> null. */
export function readWishImage(v: unknown): WishImage | null {
  const o = v as { url?: unknown; w?: unknown; h?: unknown } | null | undefined
  if (!o || typeof o.url !== 'string' || !o.url.startsWith('https://firebasestorage.googleapis.com/')) return null
  const w = Number(o.w)
  const h = Number(o.h)
  return { url: o.url, w: w > 0 ? w : 1, h: h > 0 ? h : 1 }
}
