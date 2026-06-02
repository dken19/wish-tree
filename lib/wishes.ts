// Lớp dữ liệu điều ước: kiểu dữ liệu, dữ liệu seed, và subscribe realtime.
import {
  collection,
  limit,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore'
import { getDb } from './firebase.client'
import type { ThemeKey } from './themes'

export type WishStatus = 'pending' | 'approved' | 'rejected'

export type Wish = {
  id: string
  text: string
  theme: ThemeKey
  author?: string
  createdAt: number // epoch ms
}

// Số tờ tối đa render cùng lúc (nhẹ cho mobile)
export const MAX_RENDER_DESKTOP = 500
export const MAX_RENDER_MOBILE = 200

// Điều ước mẫu (port mảng WISHES), để cây không trống lúc đầu / khi chưa cấu hình Firebase
export const SEED_WISHES: Wish[] = [
  { id: 'seed-1', theme: 'thi', text: 'Mong kỳ thi tới con làm trúng tủ, tay không run. Lạy trời cho con qua môn Toán!', author: 'một người học trò', createdAt: 0 },
  { id: 'seed-2', theme: 'diem', text: 'Ước lần này bảng điểm toàn 8 trở lên, để về nhà thấy mẹ cười thật tươi.', createdAt: 0 },
  { id: 'seed-3', theme: 'yeu', text: 'Mong bạn bàn trên một lần quay xuống mượn bút… rồi để quên luôn ở chỗ mình.', createdAt: 0 },
  { id: 'seed-4', theme: 'nha', text: 'Ước cho bố bớt mệt, mẹ bớt lo, cả nhà mình lại cùng ăn cơm tối đông đủ.', createdAt: 0 },
  { id: 'seed-5', theme: 'khoe', text: 'Chỉ mong mùa thi này đừng ốm, ngủ đủ giấc và đầu óc luôn tỉnh táo.', createdAt: 0 },
  { id: 'seed-6', theme: 'mo', text: 'Lớn lên con muốn đi thật xa, nhưng vẫn nhớ đường về lớp học cũ.', createdAt: 0 },
  { id: 'seed-7', theme: 'ban', text: 'Mong nhóm mình mãi không tan, dù sau này mỗi đứa học một trường.', createdAt: 0 },
  { id: 'seed-8', theme: 'tam', text: 'Có hôm mệt lắm, chỉ muốn ai đó nói "cố lên, ổn mà". Mình tự nói với mình vậy.', createdAt: 0 },
]

const MAX_RENDER =
  typeof window !== 'undefined' &&
  (matchMedia('(pointer:coarse)').matches || window.innerWidth < 760)
    ? MAX_RENDER_MOBILE
    : MAX_RENDER_DESKTOP

/**
 * Đăng ký nhận các điều ước đã duyệt (realtime).
 * - Có Firebase: onSnapshot collection `wishes` (status == approved).
 * - Chưa cấu hình: trả về dữ liệu seed một lần.
 * Trả về hàm hủy đăng ký.
 */
export function subscribeApproved(cb: (wishes: Wish[]) => void): () => void {
  const db = getDb()
  if (!db) {
    cb(SEED_WISHES)
    return () => {}
  }
  // Chỉ lọc theo status (equality) -> không cần composite index.
  // Sắp xếp mới nhất trước ở client.
  const q = query(
    collection(db, 'wishes'),
    where('status', '==', 'approved'),
    limit(MAX_RENDER)
  )
  return onSnapshot(
    q,
    (snap) => {
      const list: Wish[] = snap.docs
        .map((d) => {
          const data = d.data() as Record<string, unknown>
          const ts = data.createdAt as { toMillis?: () => number } | undefined
          return {
            id: d.id,
            text: String(data.text ?? ''),
            theme: data.theme as ThemeKey,
            author: data.author ? String(data.author) : undefined,
            createdAt: ts?.toMillis ? ts.toMillis() : 0,
          }
        })
        .sort((a, b) => b.createdAt - a.createdAt)
      cb(list)
    },
    (err) => {
      console.error('subscribeApproved error, fallback to seed', err)
      cb(SEED_WISHES)
    }
  )
}
