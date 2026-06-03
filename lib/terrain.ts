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
  const slopeMask = Math.sin(Math.PI * t)
  const ridge =
    (Math.sin(ang * 6) * 0.6 +
      Math.sin(ang * 11 + 3) * 0.4 +
      Math.sin(ang * 17 + 1) * 0.26) *
    slopeMask *
    5.5
  const roll =
    Math.sin(x * 0.05) * Math.sin(z * 0.06) * 2.2 * Math.max(0, (d - 55) / 45)
  return base + ridge + roll
}
