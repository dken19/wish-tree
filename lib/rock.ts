// Tảng đá ngẫu nhiên nhưng LIỀN KHỐI, KHÔNG HỞ. Bí quyết: bắt đầu từ MỘT mặt cầu
// kín (icosphere, đỉnh dùng chung) rồi đẩy mỗi đỉnh theo một hàm nhiễu LIÊN TỤC
// của hướng đỉnh -> bề mặt vẫn là một khối kín (watertight), chỉ méo đi -> không
// bao giờ thủng lỗ như kiểu gộp nhiều cục rời.
import * as THREE from 'three'
import { mulberry32 } from './tree'

// seed: cùng seed -> CÙNG một tảng đá (cảnh tất định, không đổi giữa các lần load).
export function makeRock(seed: number, detail = 2): THREE.BufferGeometry {
  const rng = mulberry32(seed)
  const g = new THREE.IcosahedronGeometry(1, detail)
  const p = g.attributes.position as THREE.BufferAttribute

  // pha + tần số theo seed -> mỗi tảng một hình nhưng LẶP LẠI đúng như cũ
  const ph = [rng() * 10, rng() * 10, rng() * 10, rng() * 10]
  const sq = 0.72 + rng() * 0.14 // hệ số dẹt (đá nằm bệt)
  // kéo lệch trục (ellipsoid) -> không còn "hòn bi" tròn đều, mỗi tảng một dáng
  const ex = 0.78 + rng() * 0.5
  const ez = 0.78 + rng() * 0.5
  const tilt = rng() * Math.PI
  const ct = Math.cos(tilt)
  const st = Math.sin(tilt)
  const v = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i)).normalize()
    // nhiễu nhiều tần (biên độ giảm dần) -> gồ ghề nhiều cấp, vẫn KÍN (watertight)
    let d = 1
    d += 0.2 * Math.sin(v.x * 1.9 + ph[0]) * Math.cos(v.y * 1.6 + ph[1])
    d += 0.12 * Math.sin(v.y * 3.1 + ph[1]) * Math.cos(v.z * 2.7 + ph[2])
    d += 0.08 * Math.sin(v.z * 4.7 + ph[2]) * Math.cos(v.x * 4.1 + ph[0])
    d += 0.05 * Math.sin(v.x * 7.3 + ph[3]) * Math.sin(v.y * 6.1 + ph[0])
    d = THREE.MathUtils.clamp(d, 0.66, 1.38)
    // toạ độ sau biến dạng + kéo lệch trục, rồi xoay quanh trục Y cho ngẫu nhiên
    let x = v.x * d * ex
    const y = v.y * d * sq
    let z = v.z * d * ez
    ;[x, z] = [x * ct - z * st, x * st + z * ct]
    p.setXYZ(i, x, y, z)
  }
  g.computeVertexNormals()
  return g
}
