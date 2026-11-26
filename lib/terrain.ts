// Địa hình ĐỈNH NÚI dùng chung cho cả lưới đất (Ground) lẫn việc ĐẶT vật thể
// (thông, nhà) đúng cao độ trên sườn/thung lũng. Tách ra đây để Ground & Scenery
// luôn dùng CÙNG một hàm -> vật thể không bị lơ lửng/chìm so với mặt đất.
import * as THREE from 'three'

export const VALLEY = -34

// Bán kính rìa đỉnh phẳng theo góc (méo, không tròn đều).
export function rEdgeAt(ang: number): number {
  return 9 + Math.sin(ang * 3) * 1.4 + Math.sin(ang * 5 + 1.1) * 0.9
}

// Cao độ địa hình tại (x,z): trong rìa = đỉnh phẳng gợn nhẹ; ngoài rìa = sườn đổ
// dốc xuống thung lũng có sống núi/khe, càng xa càng có gò lượn.
export function terrainHeight(x: number, z: number): number {
  const d = Math.hypot(x, z)
  const ang = Math.atan2(z, x)
  const rEdge = rEdgeAt(ang)
  if (d <= rEdge) {
    return Math.sin(x * 0.3) * Math.sin(z * 0.3) * 0.06
  }
  const t = THREE.MathUtils.clamp((d - rEdge) / 46, 0, 1)
  const s = t * t * (3 - 2 * t)
  const base = VALLEY * s
  // sin² -> biên độ sống núi bằng 0 VÀ phẳng đạo hàm ở mép đỉnh/đáy thung lũng (hết gấp khúc).
  // Chỉ giữ tần số thấp: bước sóng luôn >> 1 ô lưới -> sườn mượt, không gãy cạnh.
  const sm = Math.sin(Math.PI * t)
  const slopeMask = sm * sm
  const ridge = (Math.sin(ang * 5 + 0.4) * 0.65 + Math.sin(ang * 9 + 3) * 0.35) * slopeMask * 4.2
  const roll =
    Math.sin(x * 0.05) * Math.sin(z * 0.06) * 2.2 * Math.max(0, (d - 55) / 45)
  return base + ridge + roll
}

// Kích thước lưới Ground — PHẢI khớp PlaneGeometry trong Ground.tsx. Chỉ phủ đỉnh + sườn
// (ô 1m -> mượt); xa hơn GROUND_FADE_R là lưới ĐỊA HÌNH XA (FarLands) tiếp quản.
export const GROUND_SIZE = 150
export const GROUND_SEG = 150
export const GROUND_FADE_R = 63

/** Cao độ ĐỈNH LƯỚI Ground theo toạ độ MẶT PHẲNG (x, planeY = -z thế giới): = terrainHeight, ngoài GROUND_FADE_R thì chìm xuống dưới lưới xa. */
export function groundMeshHeight(x: number, z: number): number {
  const h = terrainHeight(x, z)
  const d = Math.hypot(x, z)
  return d > GROUND_FADE_R ? h - 10 * Math.min(1, (d - GROUND_FADE_R) / 1.5) : h
}
const STEP = GROUND_SIZE / GROUND_SEG
const HALF = GROUND_SIZE / 2

// Cao độ MẶT ĐẤT tại toạ độ THẾ GIỚI (x,z) — khớp ĐÚNG mặt lưới hiển thị.
// ⚠ Hai điểm mấu chốt để vật KHÔNG lơ lửng:
//  1) Lưới Ground bị `rotateX(-π/2)` -> trục z LẬT: planeY = -z.
//  2) Lưới chỉ lấy mẫu terrainHeight tại ĐỈNH LƯỚI rồi nội suy tuyến tính; thành
//     phần sống núi tần số cao (sin(ang*17…)) dao động nhanh hơn 1 ô -> giá trị
//     terrainHeight CHÍNH XÁC tại điểm bất kỳ KHÁC mặt lưới. Vì vậy phải lấy
//     BILINEAR trên cùng grid (sample terrainHeight tại 4 đỉnh ô) thì mới bám sát.
//  ⇒ mặt đất thấy được tại thế giới (x,z) = terrainHeight(x, -z) (lib/farTerrain dùng đúng vậy).
export function groundHeight(x: number, z: number): number {
  const gx = THREE.MathUtils.clamp((x + HALF) / STEP, 0, GROUND_SEG)
  const gy = THREE.MathUtils.clamp((-z + HALF) / STEP, 0, GROUND_SEG)
  const ix = Math.min(Math.floor(gx), GROUND_SEG - 1)
  const iy = Math.min(Math.floor(gy), GROUND_SEG - 1)
  const fx = gx - ix
  const fy = gy - iy
  const x0 = -HALF + ix * STEP
  const x1 = x0 + STEP
  const y0 = -HALF + iy * STEP
  const y1 = y0 + STEP
  const h00 = groundMeshHeight(x0, y0)
  const h10 = groundMeshHeight(x1, y0)
  const h01 = groundMeshHeight(x0, y1)
  const h11 = groundMeshHeight(x1, y1)
  // PlaneGeometry chia mỗi ô thành 2 TAM GIÁC theo đường chéo (0,0)-(1,1).
  // Nội suy phẳng đúng tam giác chứa điểm -> bám CHÍNH XÁC mặt lưới (lệch ~0).
  if (fx <= fy) return h00 + (h11 - h01) * fx + (h01 - h00) * fy
  return h00 + (h10 - h00) * fx + (h11 - h10) * fy
}

// ── "Hệ trọng lực" nhẹ ────────────────────────────────────────────────────────
// Đặt vật bám đất: lấy Y từ `groundHeight` + (tuỳ chọn) nghiêng theo pháp tuyến
// mặt đất để có cảm giác trọng lực tự nhiên trên sườn dốc. Tính 1 LẦN lúc dựng
// cảnh (không gọi mỗi frame) → 0 chi phí runtime, an toàn mobile.

// Pháp tuyến mặt đất ở toạ độ THẾ GIỚI (x,z) bằng sai phân hữu hạn trên
// `groundHeight`. Vì tính trên groundHeight nên tự đúng với phép lật trục z của
// lưới Ground (rotateX(-π/2)). Mặt y=h(x,z) → n ∝ (-∂h/∂x, 1, -∂h/∂z).
export function terrainNormal(x: number, z: number, eps = 0.5): THREE.Vector3 {
  const hL = groundHeight(x - eps, z)
  const hR = groundHeight(x + eps, z)
  const hD = groundHeight(x, z - eps)
  const hU = groundHeight(x, z + eps)
  return new THREE.Vector3(hL - hR, 2 * eps, hD - hU).normalize()
}

const _UP = new THREE.Vector3(0, 1, 0)

// Quaternion quay trục +Y của vật về phía pháp tuyến mặt đất (đã lerp với "up"
// theo `blend`, <1 để nghiêng vừa phải). Đỉnh phẳng có n≈+Y → gần như không nghiêng.
export function slopeQuaternion(
  x: number,
  z: number,
  blend = 1
): THREE.Quaternion {
  const n = _UP.clone().lerp(terrainNormal(x, z), blend).normalize()
  return new THREE.Quaternion().setFromUnitVectors(_UP, n)
}
