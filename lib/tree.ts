// Hình học cây + hệ thống "anchor" (điểm treo) tất định.
// Port branchDefs từ prototype, giữ đúng dáng cây low-poly.
import type { ThemeKey } from './themes'
import { THEME_KEYS } from './themes'

export type Vec3 = [number, number, number]

/** Một đoạn cành: điểm đầu a, điểm cuối b, bán kính gốc r0, bán kính ngọn r1 */
export type Branch = { a: Vec3; b: Vec3; r0: number; r1: number }

// Thân chính + các cành (port nguyên từ prototype)
export const TRUNK: Branch = { a: [0, 0, 0], b: [0.1, 1.5, 0], r0: 0.34, r1: 0.2 }

export const BRANCHES: Branch[] = [
  { a: [0.1, 1.5, 0], b: [1.5, 2.6, 0.5], r0: 0.18, r1: 0.09 },
  { a: [0.1, 1.5, 0], b: [-1.4, 2.5, -0.4], r0: 0.18, r1: 0.09 },
  { a: [0.1, 1.5, 0], b: [0.3, 2.9, 1.4], r0: 0.17, r1: 0.08 },
  { a: [0.1, 1.5, 0], b: [-0.2, 2.8, -1.5], r0: 0.17, r1: 0.08 },
  { a: [0.1, 1.5, 0], b: [0.8, 2.7, -1.1], r0: 0.15, r1: 0.07 },
  { a: [1.5, 2.6, 0.5], b: [2.2, 3.1, 0.9], r0: 0.08, r1: 0.04 },
  { a: [1.5, 2.6, 0.5], b: [1.9, 3.2, -0.2], r0: 0.08, r1: 0.04 },
  { a: [-1.4, 2.5, -0.4], b: [-2.1, 3.0, -0.9], r0: 0.08, r1: 0.04 },
  { a: [-1.4, 2.5, -0.4], b: [-1.7, 3.1, 0.4], r0: 0.08, r1: 0.04 },
  { a: [0.3, 2.9, 1.4], b: [0.7, 3.4, 2.0], r0: 0.07, r1: 0.03 },
  { a: [-0.2, 2.8, -1.5], b: [-0.5, 3.3, -2.1], r0: 0.07, r1: 0.03 },
  { a: [0.8, 2.7, -1.1], b: [1.3, 3.3, -1.7], r0: 0.07, r1: 0.03 },
]

export const ALL_BRANCHES: Branch[] = [TRUNK, ...BRANCHES]

// Ngọn cành = điểm treo gốc (12 tip)
export const TIPS: Vec3[] = BRANCHES.map((b) => b.b)

// Map mỗi theme -> một ngọn cành (zone treo). Đúng yêu cầu:
// "mỗi vị trí ứng với nơi người dùng thả".
export const THEME_ZONE: Record<ThemeKey, Vec3> = THEME_KEYS.reduce(
  (acc, key, i) => {
    acc[key] = TIPS[i % TIPS.length]
    return acc
  },
  {} as Record<ThemeKey, Vec3>
)

// ---- PRNG tất định (mulberry32) để vị trí điều ước không nhảy giữa các lần load ----
export function hashString(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Vị trí treo tất định cho một điều ước, tỏa quanh ngọn cành của theme. */
export function anchorFor(seed: string, theme: ThemeKey): Vec3 {
  const t = THEME_ZONE[theme]
  const rnd = mulberry32(hashString(seed))
  return [
    t[0] + (rnd() - 0.5) * 1.1,
    t[1] + (rnd() - 0.2) * 0.7 - 0.1,
    t[2] + (rnd() - 0.5) * 1.1,
  ]
}
