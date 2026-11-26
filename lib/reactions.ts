// Cảm xúc thả cho điều ước (client + server). Icon SVG (components/ui/Icon), KHÔNG dùng emoji.
// Lưu: wishes/{id}.reactions = { heart: n, clover: n, star: n } (đếm) + wishes/{id}/reactions/{uid} = { heart?: true, … }.
export const REACTIONS = [
  { key: 'heart', label: 'Thương', hint: 'Thả tim', color: '#e0475b' },
  { key: 'clover', label: 'May mắn', hint: 'Gửi cỏ bốn lá may mắn', color: '#2f9a5a' },
  { key: 'star', label: 'Sẽ thành', hint: 'Tin là sẽ thành', color: '#d99a1e' },
] as const

export type ReactionKey = (typeof REACTIONS)[number]['key']
export type ReactionCounts = Partial<Record<ReactionKey, number>>
export type MyReactions = Partial<Record<ReactionKey, boolean>>

export const REACTION_KEYS = REACTIONS.map((r) => r.key) as ReactionKey[]
export const isReactionKey = (v: unknown): v is ReactionKey =>
  typeof v === 'string' && (REACTION_KEYS as string[]).includes(v)

/** Đọc map đếm từ doc Firestore (bỏ giá trị lạ/âm). */
export function readCounts(v: unknown): ReactionCounts {
  const out: ReactionCounts = {}
  if (v && typeof v === 'object')
    for (const k of REACTION_KEYS) {
      const n = (v as Record<string, unknown>)[k]
      if (typeof n === 'number' && n > 0) out[k] = Math.floor(n)
    }
  return out
}
