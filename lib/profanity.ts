// Lọc từ thô tục (vi + en). Dùng cả ở client (phản hồi tức thì) lẫn server.
//
// Nguyên tắc: ƯU TIÊN KHÔNG CHẶN NHẦM (false positive tệ hơn, vì còn hàng chờ
// duyệt tay làm lớp chặn thứ hai). Vì thế:
//  - GIỮ DẤU khi so khớp -> "lồn" ≠ "lớn", "buồi" ≠ "buổi", "ngu" ≠ "ngủ".
//  - Từ đơn: khớp theo TỪ NGUYÊN VẸN (token), không khớp chuỗi con -> tránh
//    "cc" lọt vào "uốc cả", "vl" lọt vào "về làng"...
//  - Cụm có khoảng trắng: khớp chuỗi con trên văn bản đã chuẩn hóa.

// Cụm tục (chứa khoảng trắng)
const BAD_PHRASES = [
  'óc chó',
  'con chó',
  'thằng chó',
  'mẹ mày',
  'má mày',
  'súc vật',
  'con đĩ',
  'đồ chó',
]

// Từ tục đơn (giữ dấu). Chỉ khớp khi là TỪ riêng.
const BAD_TOKENS = new Set([
  // tiếng Việt
  'lồn',
  'buồi',
  'cặc',
  'cặk',
  'đụ',
  'địt',
  'đĩ',
  'cứt',
  'đéo',
  'đần',
  // viết tắt phổ biến
  'đm',
  'dm',
  'đmm',
  'dmm',
  'vl',
  'vcl',
  'vkl',
  'cc',
  'cmm',
  'cdm',
  'clm',
  'clmm',
  'đcm',
  'dcm',
  // tiếng Anh
  'fuck',
  'fuck.',
  'fucking',
  'fucker',
  'motherfucker',
  'shit',
  'bullshit',
  'bitch',
  'asshole',
  'dick',
  'pussy',
  'cunt',
  'bastard',
  'slut',
  'whore',
  'nigger',
  'faggot',
])

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFC')
    // gộp ký tự lặp 3+ lần thành 1: "địtttt" -> "địt", "fuuuck" -> "fuck"
    // (tiếng Việt hầu như không có ký tự lặp 3+ nên không hại từ thường)
    .replace(/(.)\1{2,}/gu, '$1')
    .trim()
}

function tokenize(s: string): string[] {
  // tách theo khoảng trắng & dấu câu, giữ chữ (kể cả tiếng Việt có dấu) và số
  return s.split(/[\s.,!?;:()"'`~/\\\-_*+=[\]{}<>|@#$%^&]+/u).filter(Boolean)
}

export function containsProfanity(text: string): boolean {
  const t = normalize(text)
  if (BAD_PHRASES.some((p) => t.includes(p))) return true
  const tokens = tokenize(t)
  // bỏ dấu câu dính ở mép token (vd "fuck!" -> "fuck") rồi so khớp nguyên vẹn
  return tokens.some((tok) => {
    const clean = tok.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    return BAD_TOKENS.has(tok) || BAD_TOKENS.has(clean)
  })
}

export const MAX_WISH_LEN = 160
export const MIN_WISH_LEN = 2

export type ValidationResult = { ok: true } | { ok: false; reason: string }

export function validateWish(text: string): ValidationResult {
  const t = text.trim()
  if (t.length < MIN_WISH_LEN) return { ok: false, reason: 'Điều ước hơi ngắn 🌸' }
  if (t.length > MAX_WISH_LEN)
    return { ok: false, reason: `Tối đa ${MAX_WISH_LEN} ký tự` }
  if (containsProfanity(t))
    return { ok: false, reason: 'Điều ước chứa từ ngữ chưa phù hợp 🙏' }
  return { ok: true }
}
