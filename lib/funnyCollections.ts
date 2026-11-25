// "Bộ xàm xí": gộp 2–6 điều ước xàm xí (status 'funny') liên quan nhau thành 1 bộ có tên + lời phê chung.
// Firestore `funnyCollections/{id}` { title, note, wishIds[], createdAt, createdBy } — chỉ đọc/ghi qua Admin SDK.
import type { Firestore } from 'firebase-admin/firestore'
import { millis } from '@/lib/wishServer'

export const FC_MIN = 2
export const FC_MAX = 6
export const FC_TITLE_MAX = 80
export const FC_NOTE_MAX = 300

/** note = lí do RIÊNG của tờ (có thể rỗng nếu tờ dùng lí do chung của bộ). */
export type FunnyWish = { id: string; no: number | null; text: string; theme: string; note: string; createdAt: number }
export type FunnyCollection = { id: string; title: string; note: string; createdAt: number; wishes: FunnyWish[] }

/** Đọc các bộ mới nhất + điều ước trong bộ (bỏ tờ đã rời trạng thái funny). KHÔNG trả tên người viết. */
export async function loadCollections(db: Firestore, limit = 30): Promise<FunnyCollection[]> {
  const snap = await db.collection('funnyCollections').orderBy('createdAt', 'desc').limit(limit).get()
  const ids = [...new Set(snap.docs.flatMap((d) => (d.get('wishIds') as string[] | undefined) ?? []))]
  const wishes = new Map<string, FunnyWish>()
  if (ids.length) {
    const docs = await db.getAll(...ids.map((id) => db.collection('wishes').doc(id)))
    for (const d of docs) {
      const data = d.data()
      if (!data || data.status !== 'funny') continue
      wishes.set(d.id, {
        id: d.id,
        no: typeof data.no === 'number' ? data.no : null,
        text: String(data.text ?? ''),
        theme: String(data.theme ?? ''),
        note: String(data.funnyNote ?? ''),
        createdAt: millis(data.createdAt),
      })
    }
  }
  return snap.docs.map((d) => ({
    id: d.id,
    title: String(d.get('title') ?? ''),
    note: String(d.get('note') ?? ''),
    createdAt: millis(d.get('createdAt')),
    wishes: ((d.get('wishIds') as string[] | undefined) ?? []).map((id) => wishes.get(id)).filter((w): w is FunnyWish => !!w),
  }))
}
