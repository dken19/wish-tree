// Hình học cây + hệ thống "anchor" (điểm treo) tất định.
// Port branchDefs từ prototype, giữ đúng dáng cây low-poly.
import type { ThemeKey } from './themes'
import { THEME_KEYS } from './themes'

export type Vec3 = [number, number, number]

/**
 * Một cành = đường gấp khúc qua nhiều điểm `pts` (>=2), bán kính gốc r0 -> ngọn r1.
 * Nhiều điểm -> cành gấp khúc, vặn vẹo như cây cổ thụ. Render bằng ống liền mạch.
 */
export type Branch = { pts: Vec3[]; r0: number; r1: number }

// Thân chính: cao, gốc rất to, GẤP KHÚC nhiều lần (vặn trái-phải) -> già cỗi.
export const TRUNK: Branch = {
  pts: [
    [0, 0, 0],
    [-0.16, 0.55, 0.1],
    [0.18, 1.1, -0.06],
    [-0.12, 1.7, 0.12],
    [0.16, 2.2, -0.02],
    [0.05, 2.55, 0.05],
  ],
  r0: 0.72,
  r1: 0.32,
}

// Bạnh gốc / rễ nổi xoè quanh chân thân (gấp khúc rồi cắm xuống đất).
export const ROOTS: Branch[] = [
  { pts: [[0, 0.4, 0], [0.6, 0.06, 0.34], [1.05, -0.14, 0.6]], r0: 0.34, r1: 0.06 },
  { pts: [[0, 0.42, 0], [-0.5, 0.05, 0.5], [-0.95, -0.14, 0.78]], r0: 0.32, r1: 0.06 },
  { pts: [[0, 0.42, 0], [-0.46, 0.06, -0.5], [-0.8, -0.14, -0.92]], r0: 0.33, r1: 0.06 },
  { pts: [[0, 0.4, 0], [0.52, 0.05, -0.46], [0.9, -0.14, -0.78]], r0: 0.3, r1: 0.06 },
  { pts: [[0, 0.36, 0], [0.12, 0.04, 0.6], [0.18, -0.14, 1.08]], r0: 0.28, r1: 0.06 },
]

// Cành lớn (limb): từ tán thân, mỗi cành GẤP KHÚC 3-4 đoạn, vươn ra rồi lên.
export const LIMBS: Branch[] = [
  { pts: [[0.05, 2.45, 0.05], [1.0, 2.7, 0.3], [1.7, 3.35, 0.18], [2.5, 3.5, 0.7]], r0: 0.3, r1: 0.12 },
  { pts: [[0.05, 2.45, 0.05], [-0.9, 2.62, -0.2], [-1.7, 3.3, -0.5], [-2.5, 3.5, -0.4]], r0: 0.3, r1: 0.12 },
  { pts: [[0.0, 2.2, 0.08], [0.32, 2.9, 0.9], [0.42, 3.7, 1.6], [0.6, 4.3, 2.3]], r0: 0.27, r1: 0.11 },
  { pts: [[0.0, 2.2, 0.08], [-0.2, 2.85, -0.9], [-0.36, 3.6, -1.6], [-0.5, 4.2, -2.4]], r0: 0.27, r1: 0.11 },
  { pts: [[0.05, 2.45, 0.05], [0.8, 2.8, -0.7], [1.2, 3.6, -1.3], [1.55, 4.1, -1.9]], r0: 0.25, r1: 0.1 },
  { pts: [[0.05, 2.45, 0.05], [-0.8, 2.75, 0.7], [-1.2, 3.5, 1.3], [-1.6, 4.0, 1.8]], r0: 0.25, r1: 0.1 },
]

// Nhánh con (twig): mọc tiếp từ ngọn limb, gấp khúc, mảnh -> tán rộng nhiều ngọn.
export const TWIGS: Branch[] = [
  { pts: [[2.5, 3.5, 0.7], [2.9, 4.0, 1.05], [3.35, 4.45, 1.4]], r0: 0.11, r1: 0.04 },
  { pts: [[2.5, 3.5, 0.7], [2.85, 4.15, -0.15], [3.15, 4.7, -0.5]], r0: 0.11, r1: 0.04 },
  { pts: [[-2.5, 3.5, -0.4], [-2.9, 4.0, -0.95], [-3.35, 4.45, -1.3]], r0: 0.11, r1: 0.04 },
  { pts: [[-2.5, 3.5, -0.4], [-2.8, 4.15, 0.3], [-3.05, 4.65, 0.6]], r0: 0.11, r1: 0.04 },
  { pts: [[0.6, 4.3, 2.3], [0.9, 4.7, 2.7], [1.2, 5.1, 3.0]], r0: 0.1, r1: 0.035 },
  { pts: [[-0.5, 4.2, -2.4], [-0.8, 4.6, -2.8], [-1.05, 5.0, -3.1]], r0: 0.1, r1: 0.035 },
  { pts: [[1.55, 4.1, -1.9], [1.9, 4.5, -2.25], [2.2, 4.95, -2.55]], r0: 0.1, r1: 0.035 },
  { pts: [[-1.6, 4.0, 1.8], [-1.95, 4.45, 2.15], [-2.25, 4.9, 2.45]], r0: 0.1, r1: 0.035 },
]

// Thân + rễ + cành + nhánh: tất cả render bằng ống gấp khúc thuôn.
export const ALL_BRANCHES: Branch[] = [TRUNK, ...ROOTS, ...LIMBS, ...TWIGS]

// Ngọn (điểm treo) = đầu mút các cành tán (limb + twig). Rễ/thân không treo.
const CANOPY: Branch[] = [...LIMBS, ...TWIGS]
export const TIPS: Vec3[] = CANOPY.map((b) => b.pts[b.pts.length - 1])

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

/** Ngọn cành (điểm neo trên cây) cho một điều ước. */
export function tipFor(theme: ThemeKey): Vec3 {
  return THEME_ZONE[theme]
}

/**
 * Vị trí treo tất định cho một điều ước: nằm NGAY DƯỚI ngọn cành của theme,
 * lệch ngang rất nhẹ -> đọc ra là "treo lủng lẳng từ cành".
 */
export function anchorFor(seed: string, theme: ThemeKey): Vec3 {
  const t = THEME_ZONE[theme]
  const rnd = mulberry32(hashString(seed))
  return [
    t[0] + (rnd() - 0.5) * 0.6,
    t[1] - (0.35 + rnd() * 0.85), // treo bên dưới ngọn cành
    t[2] + (rnd() - 0.5) * 0.6,
  ]
}
