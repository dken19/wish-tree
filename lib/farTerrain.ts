// ĐỊA HÌNH XA: dãy núi LIỀN MẠCH quanh đỉnh ta đứng (r ≈ 56 → 340).
// = sườn đỉnh núi (terrainHeight) + KHỐI NÚI nền (ridged noise -> sống núi, yên ngựa nối các
// ngọn) + THÁP ĐÁ VÔI (karst: vách dốc, đỉnh tròn, chân loe) mọc trên khối nền, gộp bằng
// smooth-max -> các ngọn dính nhau thành dãy chứ không đứng lẻ loi. Thêm ngọn có thiền viện
// (đỉnh phẳng đúng cao độ peakCenter(0,2)) và vài BẢN LÀNG trên cao nguyên có ruộng bậc thang.
// Hàm thuần (tất định, không random) -> FarLands dựng lưới / rải cây / đặt nhà đều khớp.
import { terrainHeight, VALLEY } from './terrain'
import { peakCenter } from './peaks'

export const FAR_R0 = 56 // nơi lưới xa bắt đầu (lấn dưới mép lưới Ground một chút)
export const FAR_R1 = 340
const MOUNT_START = 58
const MOUNT_FULL = 92

// ── noise ────────────────────────────────────────────────────────────────────────
function hash2(ix: number, iy: number, seed = 0): number {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 2246822519)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967295
}
export function vnoise(x: number, y: number, seed = 0): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10)
  const uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10)
  const a = hash2(ix, iy, seed)
  const b = hash2(ix + 1, iy, seed)
  const c = hash2(ix, iy + 1, seed)
  const d = hash2(ix + 1, iy + 1, seed)
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}
export function fbm(x: number, y: number, oct = 4, seed = 0): number {
  let v = 0
  let amp = 0.5
  let norm = 0
  for (let i = 0; i < oct; i++) {
    v += amp * vnoise(x, y, seed + i * 17)
    norm += amp
    x = x * 2.03 + 11.7
    y = y * 2.03 - 5.3
    amp *= 0.5
  }
  return v / norm
}
/** Ridged fbm: các "sống" nối thành mạng -> dãy núi chạy dài (đỉnh sống bo tròn). 0..1 */
function ridged(x: number, y: number, oct = 4, seed = 0): number {
  let v = 0
  let amp = 0.5
  let norm = 0
  let prev = 1
  for (let i = 0; i < oct; i++) {
    // |q| mềm (sqrt(q²+k)) thay cho abs -> sống núi BO TRÒN, không thành mép dao sắc
    const q = vnoise(x, y, seed + i * 31) * 2 - 1
    const n = (1 - Math.sqrt(q * q + 0.03)) / (1 - Math.sqrt(0.03))
    const r = n * n * prev
    v += amp * r
    norm += amp
    prev = n
    x = x * 2.1 + 3.1
    y = y * 2.1 - 7.7
    amp *= 0.5
  }
  return v / norm
}

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}
/** smooth max: gộp 2 khối cao độ có "yên ngựa" mềm thay vì gấp khúc. */
function smax(a: number, b: number, k: number): number {
  const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (b - a)) / k))
  return a * (1 - h) + b * h + k * h * (1 - h)
}
const smin = (a: number, b: number, k: number) => -smax(-a, -b, k)

// ── điểm đặc biệt ─────────────────────────────────────────────────────────────────
const TEMPLE = peakCenter(0, 2)
export const TEMPLE_ANG = Math.atan2(TEMPLE.z, TEMPLE.x)
const TEMPLE_R = Math.hypot(TEMPLE.x, TEMPLE.z)
const TEMPLE_TOP = TEMPLE.apexY - 1.5 // mặt bệ đền đặt ở apexY-1.4

export type Hamlet = { x: number; z: number; y: number; rad: number }
/** Bản làng trên cao nguyên (góc lệch so với hướng thiền viện để không che đền). */
export const HAMLETS: Hamlet[] = [
  { da: 1.15, r: 104, y: -15, rad: 10 },
  { da: -1.35, r: 112, y: -13, rad: 11 },
  { da: 2.45, r: 98, y: -16, rad: 9 },
  { da: -2.6, r: 126, y: -11, rad: 12 },
  { da: 0.62, r: 150, y: -8, rad: 10 },
  { da: -0.75, r: 165, y: -6, rad: 11 },
].map((s) => {
  const a = TEMPLE_ANG + s.da
  return { x: Math.cos(a) * s.r, z: Math.sin(a) * s.r, y: s.y, rad: s.rad }
})

// ── tháp đá vôi (jittered grid, mỗi ô ≤ 1 tháp) ─────────────────────────────────
const CELL = 27
function towers(x: number, z: number, scale: number): number {
  const cx = Math.floor(x / CELL)
  const cz = Math.floor(z / CELL)
  let best = 0
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const gx = cx + i
      const gz = cz + j
      if (hash2(gx, gz, 91) < 0.28) continue // ô trống -> khoảng thở giữa các cụm
      const px = (gx + 0.15 + hash2(gx, gz, 92) * 0.7) * CELL
      const pz = (gz + 0.15 + hash2(gx, gz, 93) * 0.7) * CELL
      // xa thì tháp rộng hơn (lưới xa thưa -> tháp hẹp sẽ thành gai nhọn)
      const R = CELL * (0.3 + hash2(gx, gz, 94) * 0.22) * (0.85 + 0.3 * scale)
      const H = (16 + hash2(gx, gz, 95) * 26) * scale
      // chân ELIP xoay ngẫu nhiên -> mỗi tháp một dáng, không phải vòm tròn đều
      const rot = hash2(gx, gz, 96) * Math.PI
      const el = 0.65 + hash2(gx, gz, 97) * 0.7
      const dx = x - px
      const dz = z - pz
      const lx = (dx * Math.cos(rot) + dz * Math.sin(rot)) / el
      const lz = (-dx * Math.sin(rot) + dz * Math.cos(rot)) * el
      const ang = Math.atan2(lz, lx)
      // mép thân lượn sóng theo góc (khe/rãnh đá vôi) + đỉnh lệch tâm
      const wob = 1 + 0.14 * Math.sin(ang * 3 + gx) + 0.05 * Math.sin(ang * 5 + gz * 1.7)
      const u = Math.hypot(lx, lz) / (R * wob)
      // MỘT đường cong liền (exp(-u⁴)): đỉnh tròn đầy, vách dốc, chân loe mềm — đạo hàm liên tục
      // nên không có mép gãy giữa thân và chân (trước đây max(body, skirt) để lại "nét" trên sườn)
      if (u > 2.6) continue
      const u2 = u * u
      let prof = Math.exp(-u2 * u2) * 0.8 + Math.exp(-u2 * 0.45) * 0.2
      prof *= 0.93 + 0.12 * vnoise(x * 0.1, z * 0.1, gx * 7 + gz) // mặt gồ ghề nhẹ
      best = smax(best, H * prof, 3) // các tháp chồng nhau nối bằng yên ngựa mềm

    }
  return best
}

/** Cao độ khối núi phía trên đáy thung lũng (chưa nhân bao r). */
function mountains(x: number, z: number, r: number): number {
  const scale = 0.75 + 0.75 * smooth(90, 280, r) // xa -> núi cao hơn (đường chân trời)
  const nx = x / 78
  const nz = z / 78
  const massif = Math.pow(ridged(nx, nz, 4, 5), 1.35) * 30 * scale + fbm(nx * 2.2, nz * 2.2, 3, 9) * 7
  let tw = towers(x, z, scale)
  // né hành lang nhìn từ đỉnh -> thiền viện (đền luôn lộ ra)
  const dAng = Math.abs(((Math.atan2(z, x) - TEMPLE_ANG + Math.PI * 3) % (Math.PI * 2)) - Math.PI)
  const corridor = r < TEMPLE_R + 6 ? smooth(10, 22, dAng * r) : 1
  tw *= corridor
  return smax(massif * (0.55 + 0.45 * corridor), tw, 9)
}

/** Cao độ địa hình xa tại (x,z) — khớp terrainHeight ở mép trong. */
export function farHeight(x: number, z: number): number {
  const r = Math.hypot(x, z)
  let h = terrainHeight(x, -z) // lưới Ground lật trục z (xem groundHeight)
  const e = smooth(MOUNT_START, MOUNT_FULL, r)
  if (e > 0) h += e * mountains(x, z, r)

  // DÃY NÚI HẬU (r 270→340): luôn có đất che kín tới đường chân trời -> nhìn qua khe thung lũng
  // không lọt ra nửa dưới vòm trời (trước lộ thành dải xám nhạt giữa các dãy núi)
  const back = smooth(250, 330, r)
  if (back > 0) h = smax(h, VALLEY + back * (34 + fbm(x / 60, z / 60, 3, 13) * 30), 8)

  // ngọn thiền viện: đỉnh PHẲNG bán kính ~6 đúng cao độ bệ đền, vách dốc xuống thung lũng;
  // núi khác quanh đó bị hạ để không trùm lên đền
  const dt = Math.hypot(x - TEMPLE.x, z - TEMPLE.z)
  if (dt < 34) {
    h = smin(h, TEMPLE_TOP - 2 + smooth(8, 30, dt) * 60, 4)
    const u = Math.max(0, dt - 6) / 17
    const u2 = u * u
    const tower = VALLEY + (TEMPLE_TOP - VALLEY) * Math.exp(-u2 * u2 * 1.2)
    h = smax(h, tower, 3)
    // mặt bệ đền phẳng, viền chuyển mềm (không bậc)
    h += (TEMPLE_TOP - h) * (1 - smooth(5.5, 8, dt))
  }

  // bản làng: san phẳng cao nguyên, rìa thoải xuống (ruộng bậc thang ở rìa)
  for (const v of HAMLETS) {
    const d = Math.hypot(x - v.x, z - v.z)
    if (d < v.rad + 22) {
      const w = 1 - smooth(v.rad * 0.8, v.rad + 20, d)
      // rìa cao nguyên không thấp hơn dải bậc thang -> thành đồi bậc thang ôm lấy làng
      h = h * (1 - w) + v.y * w
    }
  }
  return h
}

/** Mức "ruộng bậc thang" 0..1 quanh bản làng (shader vẽ vệt đồng mức). */
export function terraceMask(x: number, z: number): number {
  let m = 0
  for (const v of HAMLETS) {
    const d = Math.hypot(x - v.x, z - v.z)
    m = Math.max(m, smooth(v.rad * 0.7, v.rad * 1.1, d) * (1 - smooth(v.rad + 12, v.rad + 24, d)))
  }
  return m
}

/** Độ dốc (|grad|) bằng sai phân. */
export function farSlope(x: number, z: number, eps = 1): number {
  const hx = farHeight(x + eps, z) - farHeight(x - eps, z)
  const hz = farHeight(x, z + eps) - farHeight(x, z - eps)
  return Math.hypot(hx, hz) / (2 * eps)
}
