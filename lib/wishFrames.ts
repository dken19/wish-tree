// "Khung" trang trí tờ ước — chủ nhân chọn (cùng chỗ chọn giao diện/skin). CHỈ ước của người đăng nhập (có uid).
// Khung vẽ bằng CSS + SVG nhỏ (components/ui/WishFrame), màu ăn theo điểm nhấn của skin (--wd-accent) -> mọi
// skin × mọi khung đều hợp. Dùng ở trang chi tiết + thẻ đọc trên cây. Client + server.

export type WishFrameKey = 'tron' | 'dong-son' | 'may' | 'tre' | 'chi-theu' | 'sen'

export const WISH_FRAMES: Record<WishFrameKey, { label: string; hint: string }> = {
  tron: { label: 'Trơn', hint: 'Tờ giấy gọn, không viền' },
  'dong-son': { label: 'Đông Sơn', hint: 'Viền răng cưa + mặt trời trống đồng' },
  may: { label: 'Mây lành', hint: 'Mây cuộn ở bốn góc' },
  tre: { label: 'Tre xanh', hint: 'Hai đốt tre hai bên, lá tre ở góc' },
  'chi-theu': { label: 'Chỉ thêu', hint: 'Đường khâu tay + mũi thêu ở góc' },
  sen: { label: 'Hoa sen', hint: 'Viền đôi + đoá sen dưới chân' },
}

export const WISH_FRAME_KEYS = Object.keys(WISH_FRAMES) as WishFrameKey[]
export const DEFAULT_FRAME: WishFrameKey = 'tron'

export const isWishFrame = (v: unknown): v is WishFrameKey =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(WISH_FRAMES, v)
