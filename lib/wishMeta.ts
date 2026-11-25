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
