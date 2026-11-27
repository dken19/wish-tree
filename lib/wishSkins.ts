// "Giao diện" trang chi tiết điều ước (/dieu-uoc/[no]). CHỈ điều ước của người đăng nhập (có uid)
// mới được chủ nhân chọn skin; ước ẩn danh luôn dùng trang giấy thường (PLAIN).
// Dùng chung cho trang (biến CSS) và ảnh chia sẻ OG (satori: màu inline) -> chỉ dùng màu/gradient đơn giản.

export type WishSkinKey = 'giay-do' | 'trang-dem' | 'hoa-dao' | 'ngoc-bich' | 'hoang-kim'

export type WishSkin = {
  label: string
  /** nền sau tờ giấy (gradient CSS) */
  bg: string
  /** tờ giấy */
  paper: string
  /** chữ trên tờ giấy */
  ink: string
  /** chữ phụ trên tờ giấy */
  soft: string
  /** điểm nhấn: viền, dấu "Ước", tên */
  accent: string
  /** điểm nhấn ĐẬM cho chữ nhỏ trên giấy (tên, link) — tương phản ≥4.5:1 với paper */
  deep: string
  /** chữ trên nền (ngoài tờ giấy) */
  onBg: string
  /** chấm màu trong bảng chọn */
  swatch: string
}

export const WISH_SKINS: Record<WishSkinKey, WishSkin> = {
  'giay-do': {
    label: 'Giấy đỏ',
    bg: 'linear-gradient(160deg, #7d1020 0%, #a8162b 45%, #d0452f 100%)',
    paper: '#fff6e8',
    ink: '#3a1d14',
    soft: '#8a5a44',
    accent: '#c8102e',
    deep: '#a50d26',
    onBg: '#fff3e2',
    swatch: '#c8102e',
  },
  'trang-dem': {
    label: 'Trăng đêm',
    bg: 'linear-gradient(170deg, #0b1630 0%, #18284f 55%, #2f3f73 100%)',
    paper: '#f7f1df',
    ink: '#1b2440',
    soft: '#5a6385',
    accent: '#c9a23f',
    deep: '#7a5c12',
    onBg: '#f3e6bf',
    swatch: '#18284f',
  },
  'hoa-dao': {
    label: 'Hoa đào',
    bg: 'linear-gradient(160deg, #fbd3dc 0%, #f7a8bb 50%, #e9788f 100%)',
    paper: '#fffafb',
    ink: '#4a2230',
    soft: '#a0566b',
    accent: '#d6456b',
    deep: '#a8284c',
    onBg: '#5a1f31',
    swatch: '#f08aa3',
  },
  'ngoc-bich': {
    label: 'Ngọc bích',
    bg: 'linear-gradient(160deg, #0e3b33 0%, #17614f 50%, #3d8f72 100%)',
    paper: '#f2f8f1',
    ink: '#13302a',
    soft: '#4b7064',
    accent: '#1f7a5c',
    deep: '#17614a',
    onBg: '#e5f5ec',
    swatch: '#17614f',
  },
  'hoang-kim': {
    label: 'Hoàng kim',
    bg: 'linear-gradient(160deg, #6b4a12 0%, #b0812a 45%, #e8c46a 100%)',
    paper: '#fffaf0',
    ink: '#3b2a0c',
    soft: '#8b6a2c',
    accent: '#a8761c',
    deep: '#7a540e',
    onBg: '#fff6df',
    swatch: '#d4a441',
  },
}

export const WISH_SKIN_KEYS = Object.keys(WISH_SKINS) as WishSkinKey[]
export const DEFAULT_SKIN: WishSkinKey = 'giay-do'

export const isWishSkin = (v: unknown): v is WishSkinKey =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(WISH_SKINS, v)

/** Trang giấy thường cho ước ẩn danh (không chọn được skin). */
export const PLAIN_SKIN: WishSkin = {
  label: 'Thường',
  bg: 'linear-gradient(160deg, #dfe8e2 0%, #eef2ec 100%)',
  paper: '#ffffff',
  ink: '#2b2a28',
  soft: '#6c6a64',
  accent: '#8a7a6a',
  deep: '#6c5a48',
  onBg: '#2b2a28',
  swatch: '#cccccc',
}

/** Biến CSS --wd-* của 1 skin (trang chi tiết, thẻ đọc trên cây, vé danh sách dùng chung). */
export const skinVars = (s: WishSkin): Record<string, string> => ({
  '--wd-bg': s.bg,
  '--wd-paper': s.paper,
  '--wd-ink': s.ink,
  '--wd-soft': s.soft,
  '--wd-accent': s.accent,
  '--wd-deep': s.deep,
  '--wd-on-bg': s.onBg,
})
