// Bố cục map phòng Rừng Trúc (TẤT ĐỊNH, dùng chung cho cảnh 3D + va chạm của nhân vật).
// Tâm sân là vòng người ngồi ôn bài; bàn thờ ở hậu cảnh; ao sen bên trái; rừng trúc thành cụm quanh sân,
// chừa khoảng trống ở các khu chơi. Toạ độ mét, mặt đất phẳng y = 0.
import * as THREE from 'three'

const TAU = Math.PI * 2

export const SEAT_R = 3.6 // vòng ghế ngồi (Meditators)
export const WALK_R = 22 // ra xa hơn là sương + phông núi
export const PLAYER_R = 0.32

export const SHRINE_POS = new THREE.Vector3(-3.2, 0, -5.8)
/** Hướng bàn thờ quay mặt (về tâm sân). */
export const SHRINE_FACE = Math.atan2(-SHRINE_POS.x, -SHRINE_POS.z)
/** Chỗ đứng vái: trước bàn hương 1,9 m. */
export const SHRINE_STAND = SHRINE_POS.clone().add(
  new THREE.Vector3(Math.sin(SHRINE_FACE), 0, Math.cos(SHRINE_FACE)).multiplyScalar(2.05)
)

export const POND = { x: 7.2, z: -2.4, r: 2.3 }

type Circle = { x: number; z: number; r: number }

function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

const KEEP_OUT: Circle[] = [
  { x: 0, z: 0, r: 6.2 }, // sân giữa
  { x: SHRINE_POS.x, z: SHRINE_POS.z, r: 3.2 },
  { x: POND.x, z: POND.z, r: POND.r + 1.6 },
]

/** Tâm các khóm trúc (4–8 cây/khóm), r 7,5–21,5, né sân/bàn thờ/ao. Mobile chỉ vẽ N khóm đầu. */
export const BAMBOO_CLUSTERS: { x: number; z: number; per: number }[] = (() => {
  const r = rng(4242)
  const out: { x: number; z: number; per: number }[] = []
  let guard = 0
  while (out.length < 56 && guard++ < 4000) {
    const a = r() * TAU
    const d = 7.5 + r() * 14
    const x = Math.cos(a) * d
    const z = Math.sin(a) * d
    if (KEEP_OUT.some((k) => Math.hypot(x - k.x, z - k.z) < k.r)) continue
    if (out.some((c) => Math.hypot(x - c.x, z - c.z) < 2.6)) continue
    out.push({ x, z, per: 4 + Math.floor(r() * 5) })
  }
  return out
})()

// Số khóm trúc đang vẽ (Bamboo đặt theo mobile/desktop) -> va chạm khớp với cái nhìn thấy
let bambooCount = BAMBOO_CLUSTERS.length
export function setBambooCount(n: number) {
  bambooCount = n
}

/** Vật cản tĩnh (hình tròn) ngoài trúc. Người ngồi được truyền thêm ở resolveMove. */
const STATIC_OBSTACLES: Circle[] = [
  { x: SHRINE_POS.x, z: SHRINE_POS.z, r: 1.15 },
  // bàn hương trước tượng + 2 đèn đá
  ...[
    [0, 0.95, 0.42],
    [-1.25, 0.5, 0.3],
    [1.25, 0.5, 0.3],
  ].map(([lx, lz, r]) => ({
    x: SHRINE_POS.x + lx * Math.cos(SHRINE_FACE) + lz * Math.sin(SHRINE_FACE),
    z: SHRINE_POS.z - lx * Math.sin(SHRINE_FACE) + lz * Math.cos(SHRINE_FACE),
    r,
  })),
  { x: POND.x, z: POND.z, r: POND.r + 0.15 },
]

/** Tất cả vật cản hiện tại (tĩnh + trúc đang vẽ + extra). */
export function allObstacles(extra: Circle[] = []): Circle[] {
  return STATIC_OBSTACLES.concat(
    BAMBOO_CLUSTERS.slice(0, bambooCount).map((c) => ({ x: c.x, z: c.z, r: 1.0 })),
    extra
  )
}

/** Hướng đi (dx,dz đã chuẩn hoá) -> lách vật cản phía trước (steering nhẹ, đủ cho map thưa). */
export function steer(x: number, z: number, dx: number, dz: number, extra: Circle[] = []): [number, number] {
  let sx = 0
  let sz = 0
  for (const o of allObstacles(extra)) {
    const ox = o.x - x
    const oz = o.z - z
    const ahead = ox * dx + oz * dz // khoảng cách dọc hướng đi
    if (ahead < 0 || ahead > 1.6) continue
    const lat = ox * -dz + oz * dx // lệch ngang (dương = bên trái)
    const need = o.r + PLAYER_R + 0.15
    if (Math.abs(lat) >= need) continue
    const side = lat >= 0 ? -1 : 1 // né sang phía ngược lại
    const w = (1 - ahead / 1.6) * (1 - Math.abs(lat) / need) * 2.2
    sx += -dz * side * w
    sz += dx * side * w
  }
  const nx = dx + sx
  const nz = dz + sz
  const l = Math.hypot(nx, nz) || 1
  return [nx / l, nz / l]
}

/** Đẩy điểm (x,z) ra khỏi vật cản + giữ trong bán kính map. */
export function resolveMove(x: number, z: number, extra: Circle[] = []): [number, number] {
  for (let pass = 0; pass < 2; pass++) {
    for (const o of allObstacles(extra)) {
      const dx = x - o.x
      const dz = z - o.z
      const d = Math.hypot(dx, dz)
      const min = o.r + PLAYER_R
      if (d < min && d > 1e-4) {
        x = o.x + (dx / d) * min
        z = o.z + (dz / d) * min
      }
    }
  }
  const d = Math.hypot(x, z)
  if (d > WALK_R) {
    x *= WALK_R / d
    z *= WALK_R / d
  }
  return [x, z]
}

/** Vị trí ghế thứ i trên n ghế (vòng tròn quanh tâm). */
export function seatPos(i: number, n: number): [number, number] {
  const a = (i / Math.max(1, n)) * TAU
  return [Math.cos(a) * SEAT_R, Math.sin(a) * SEAT_R]
}
