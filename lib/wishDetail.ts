// Server-only: đọc 1 điều ước ĐÃ ĐĂNG theo số #N cho trang chi tiết /dieu-uoc/[no] + ảnh chia sẻ OG.
import 'server-only'
import { cache } from 'react'
import { revalidatePath } from 'next/cache'
import { getAdminDb, isAdminConfigured } from './firebase.admin'
import { SEED_WISHES } from './wishes'
import { publicWish, type PublicWish } from './wishServer'

/** "888" -> 888; số không hợp lệ -> null. */
export function parseWishNo(raw: string): number | null {
  if (!/^\d{1,9}$/.test(raw)) return null
  const n = Number(raw)
  return n > 0 ? n : null
}

/**
 * Điều ước #no nếu đang approved (bị gỡ/chờ duyệt/báo cáo -> null => 404).
 * `cache` gộp các lần gọi trong CÙNG 1 request (generateMetadata + page).
 */
export const getWishByNo = cache(async (no: number): Promise<PublicWish | null> => {
  if (!isAdminConfigured) {
    const w = SEED_WISHES.find((x) => x.no === no)
    if (!w) return null
    return {
      id: w.id,
      no: w.no ?? no,
      text: w.text,
      theme: w.theme,
      author: w.author ?? null,
      createdAt: w.createdAt,
      commentCount: 0,
      verified: !!w.verified,
      achieved: !!w.achieved,
      skin: null,
      reactions: {},
    }
  }
  const snap = await getAdminDb()!.collection('wishes').where('no', '==', no).limit(3).get()
  const d = snap.docs.find((x) => x.get('status') === 'approved')
  return d ? publicWish(d) : null
})

/** Trang chi tiết là ISR -> gọi sau khi đổi nội dung/trạng thái/skin để trang + ảnh OG làm mới ngay. */
export function revalidateWishPage(no: unknown) {
  if (typeof no !== 'number' || !(no > 0)) return
  try {
    revalidatePath(`/dieu-uoc/${no}`)
    revalidatePath(`/dieu-uoc/${no}/opengraph-image`)
    revalidatePath(`/dieu-uoc/${no}/twitter-image`)
  } catch (e) {
    console.warn('[revalidateWishPage]', e)
  }
}
