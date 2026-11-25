// Trò "vái tượng" ở phòng Rừng Trúc: vái đủ 3 lần -> 1 lời chúc + buff "được chúc phúc" (chỉ hiệu ứng,
// không ảnh hưởng gì khác). Mỗi thiết bị nhận 1 lời chúc / NGÀY (theo giờ Việt Nam), lưu ở localStorage.
// Giọng: ấm áp, cầu bình an, KHÔNG phán vận hạn hay hứa hẹn tiền bạc.

export const BOWS_NEEDED = 3
export const BUFF_MINUTES = 60

export type Blessing = { title: string; text: string }

export const BLESSINGS: Blessing[] = [
  { title: 'Bình an', text: 'Hôm nay lòng bạn nhẹ như mây, việc gì cũng thong thả mà xong.' },
  { title: 'Học tấn tới', text: 'Chữ vào đầu như nước vào ruộng. Học đến đâu nhớ đến đó.' },
  { title: 'Thi thuận lợi', text: 'Đề ra trúng phần bạn đã ôn, tay không run, đầu sáng suốt.' },
  { title: 'Sức khoẻ', text: 'Ngủ đủ, ăn ngon, thân khoẻ thì việc gì cũng làm được.' },
  { title: 'Gia đình', text: 'Bữa cơm tối nay có tiếng cười. Bố mẹ khoẻ, nhà mình yên vui.' },
  { title: 'Bạn bè', text: 'Có người bạn ngồi cạnh, cùng ôn, cùng nghỉ, cùng cố gắng.' },
  { title: 'Kiên trì', text: 'Mỗi ngày một chút, như giọt nước mài đá. Bạn đang đi đúng đường.' },
  { title: 'Tập trung', text: 'Phiên tới bạn sẽ vào guồng rất nhanh, quên cả điện thoại.' },
  { title: 'Tự tin', text: 'Bạn giỏi hơn bạn nghĩ. Cứ bình tĩnh làm từng câu một.' },
  { title: 'Gặp may', text: 'Một tin vui nhỏ đang trên đường tới. Để ý nhé.' },
  { title: 'Thảnh thơi', text: 'Hít sâu, thở chậm. Mọi chuyện rồi sẽ ổn cả thôi.' },
  { title: 'Ước mơ', text: 'Điều bạn ước đang lớn dần lên, như mầm trúc sau mưa.' },
  { title: 'Ngủ ngon', text: 'Tối nay ngủ một giấc thật sâu, sáng mai dậy thật tươi.' },
  { title: 'Nhẫn nại', text: 'Việc khó hôm nay sẽ là việc dễ của ngày mai.' },
  { title: 'Ấm áp', text: 'Có người đang nghĩ tới bạn và mong bạn vui.' },
  { title: 'Khởi đầu mới', text: 'Hôm nay là ngày tốt để bắt đầu việc bạn còn chần chừ.' },
  { title: 'Trí nhớ', text: 'Công thức, từ mới, ngày tháng: đọc một lần là nhớ lâu.' },
  { title: 'Bình tĩnh', text: 'Gió to mấy thì gốc trúc vẫn vững. Bạn cũng vậy.' },
  { title: 'Niềm vui', text: 'Một chuyện nhỏ thôi cũng đủ làm bạn cười cả buổi chiều.' },
  { title: 'Đủ đầy', text: 'Bạn có đủ thời gian cho việc quan trọng, và cả cho mình nữa.' },
  { title: 'Vượt khó', text: 'Chỗ bạn đang mắc sẽ gỡ được, có khi chỉ sau một lần nghỉ ngắn.' },
  { title: 'Thầy cô quý', text: 'Bài làm tốt, lời khen tới đúng lúc bạn cần nhất.' },
  { title: 'Lạc quan', text: 'Trời nào cũng có lúc nắng. Hôm nay nắng đến sớm hơn.' },
  { title: 'Tinh tấn', text: 'Ba phiên ôn liền mạch, xong việc còn kịp đi dạo.' },
]

/** "2026-11-25" theo giờ Việt Nam (UTC+7). */
export function vnDayKey(ms = Date.now()): string {
  return new Date(ms + 7 * 3600_000).toISOString().slice(0, 10)
}

export type BlessingRecord = { day: string; idx: number; until: number }
const KEY = 'wish-tree:blessing'

export function loadBlessing(): BlessingRecord | null {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) ?? 'null') as BlessingRecord | null
    return r && typeof r.idx === 'number' && r.idx >= 0 && r.idx < BLESSINGS.length ? r : null
  } catch {
    return null
  }
}

export function saveBlessing(r: BlessingRecord) {
  try {
    localStorage.setItem(KEY, JSON.stringify(r))
  } catch {
    /* private mode: bỏ qua */
  }
}

/** Rút 1 lời chúc cho hôm nay (ngẫu nhiên). */
export function drawBlessing(now = Date.now()): BlessingRecord {
  return { day: vnDayKey(now), idx: Math.floor(Math.random() * BLESSINGS.length), until: now + BUFF_MINUTES * 60_000 }
}
