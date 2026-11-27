// Server-only: đọc 1 điều ước ĐÃ ĐĂNG theo số #N cho trang chi tiết /dieu-uoc/[no] + ảnh chia sẻ OG.
import 'server-only'
import { cache } from 'react'
import { revalidatePath } from 'next/cache'
import { getAdminDb, isAdminConfigured } from './firebase.admin'
import { SEED_WISHES } from './wishes'
import { publicWish, type PublicWish } from './wishServer'
import { isShareKey, privateWishPath } from './wishMeta'

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
      skin: w.skin ?? null,
      reactions: {},
      image: w.image ?? null,
      frame: w.frame ?? null,
    }
  }
  const snap = await getAdminDb()!.collection('wishes').where('no', '==', no).limit(3).get()
  const d = snap.docs.find((x) => x.get('status') === 'approved')
  return d ? publicWish(d) : null
})

/**
 * Điều ước RIÊNG TƯ theo link bí mật /dieu-uoc/rieng/<key>.
 * CHỈ trả khi status === 'private' đúng nghĩa (đã đăng, chủ chọn riêng tư) và không bị báo cáo tạm ẩn.
 * Chờ duyệt / bị gỡ / xàm xí / flagged -> null => 404, dù có đúng key. Ước đã chuyển về công khai
 * -> trả { publicNo } để trang chuyển hướng sang /dieu-uoc/<no>.
 */
export const getWishByKey = cache(
  async (key: string): Promise<{ wish: PublicWish } | { publicNo: number } | null> => {
    if (!isShareKey(key) || !isAdminConfigured) return null
    const snap = await getAdminDb()!.collection('wishes').where('shareKey', '==', key).limit(2).get()
    if (snap.size !== 1) return null
    const d = snap.docs[0]
    if (d.get('flagged')) return null
    const st = d.get('status')
    if (st === 'private') return { wish: publicWish(d) }
    if (st === 'approved' && typeof d.get('no') === 'number') return { publicNo: d.get('no') }
    return null
  }
)

export function revalidatePrivatePage(key: unknown) {
  if (!isShareKey(key)) return
  try {
    const p = privateWishPath(key)
    revalidatePath(p)
    revalidatePath(`${p}/opengraph-image`)
    revalidatePath(`${p}/twitter-image`)
  } catch (e) {
    console.warn('[revalidatePrivatePage]', e)
  }
}

/** Trang chi tiết là ISR -> gọi sau khi đổi nội dung/trạng thái/skin để trang + ảnh OG làm mới ngay. */
/** `shareKey` (tuỳ chọn): làm mới luôn link riêng tư của ước đó. */
export function revalidateWishPage(no: unknown, shareKey?: unknown) {
  revalidatePrivatePage(shareKey)
  if (typeof no !== 'number' || !(no > 0)) return
  try {
    revalidatePath(`/dieu-uoc/${no}`)
    revalidatePath(`/dieu-uoc/${no}/opengraph-image`)
    revalidatePath(`/dieu-uoc/${no}/twitter-image`)
  } catch (e) {
    console.warn('[revalidateWishPage]', e)
  }
}
