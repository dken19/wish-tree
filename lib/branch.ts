// Cành cây KHÔ: hệ cành PHÂN NHÁNH, cong, gnarled (không phải "que thẳng nhọn").
// Một thân chính uốn lượn (random-walk có nhiễu) thuôn dần, dọc thân mọc ra các
// cành con lệch trục, đệ quy nhỏ dần -> bóng dáng cành khô thật.
//
// makeBranch(): một HỆ cành trong KHÔNG GIAN LOCAL, gốc (0,0,0) mọc theo +Y.
// mergeBranches(): gộp nhiều hệ (mỗi hệ 1 ma trận đặt) -> 1 geometry / 1 draw call.
import * as THREE from 'three'

const TAU = Math.PI * 2
const UP = new THREE.Vector3(0, 1, 0)

function jitter(rng: () => number): THREE.Vector3 {
  return new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5)
}

function perpendicular(t: THREE.Vector3): THREE.Vector3 {
  const arb =
    Math.abs(t.y) < 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
  const n = new THREE.Vector3().crossVectors(t, arb)
  if (n.lengthSq() < 1e-8) n.set(1, 0, 0)
  return n.normalize()
}

// Ống thuôn bám theo danh sách điểm (CatmullRom -> cong mượt), có bịt chóp ngọn.
// Khung quay dùng PARALLEL TRANSPORT (không Frenet) -> KHÔNG bao giờ sinh NaN ở
// khúc cong (Frenet NaN sẽ làm bounding sphere NaN -> cả mesh bị cull, biến mất).
function tubeAlong(
  points: THREE.Vector3[],
  baseR: number,
  tipR: number,
  radial: number
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5)
  const segs = Math.max(5, (points.length - 1) * 3)
  const pts = curve.getPoints(segs)

  // tiếp tuyến tại mỗi điểm
  const tan: THREE.Vector3[] = []
  for (let i = 0; i <= segs; i++) {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(segs, i + 1)]
    const t = new THREE.Vector3().subVectors(b, a)
    if (t.lengthSq() < 1e-12) t.set(0, 1, 0)
    tan.push(t.normalize())
  }
  // parallel-transport pháp tuyến dọc ống
  const normals: THREE.Vector3[] = []
  const binormals: THREE.Vector3[] = []
  let nrm = perpendicular(tan[0])
  for (let i = 0; i <= segs; i++) {
    const t = tan[i]
    // chiếu pháp tuyến trước về mặt phẳng vuông góc tiếp tuyến hiện tại
    nrm = nrm.clone().addScaledVector(t, -nrm.dot(t))
    if (nrm.lengthSq() < 1e-8) nrm = perpendicular(t)
    nrm.normalize()
    normals.push(nrm.clone())
    binormals.push(new THREE.Vector3().crossVectors(t, nrm).normalize())
  }

  const ringAt = (i: number): THREE.Vector3[] => {
    const t = i / segs
    const r = THREE.MathUtils.lerp(baseR, tipR, Math.pow(t, 0.7))
    const P = pts[i]
    const N = normals[i]
    const B = binormals[i]
    const ring: THREE.Vector3[] = []
    for (let j = 0; j < radial; j++) {
      const v = (j / radial) * TAU
      const c = Math.cos(v)
      const s = Math.sin(v)
      ring.push(
        new THREE.Vector3(
          P.x + (N.x * c + B.x * s) * r,
          P.y + (N.y * c + B.y * s) * r,
          P.z + (N.z * c + B.z * s) * r
        )
      )
    }
    return ring
  }

  const pos: number[] = []
  let prev = ringAt(0)
  for (let i = 1; i <= segs; i++) {
    const cur = ringAt(i)
    for (let j = 0; j < radial; j++) {
      const k = (j + 1) % radial
      const a = prev[j]
      const b = prev[k]
      const c = cur[k]
      const d = cur[j]
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
      pos.push(a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z)
    }
    prev = cur
  }
  const tipP = pts[segs]
  for (let j = 0; j < radial; j++) {
    const k = (j + 1) % radial
    pos.push(prev[j].x, prev[j].y, prev[j].z, prev[k].x, prev[k].y, prev[k].z, tipP.x, tipP.y, tipP.z)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}

// Mọc một nhánh (thân cong) rồi đệ quy ra cành con lệch trục.
function grow(
  start: THREE.Vector3,
  dir: THREE.Vector3,
  length: number,
  base: number,
  depth: number,
  rng: () => number,
  radial: number,
  out: THREE.BufferGeometry[]
) {
  const nseg = 3 + depth
  const segLen = length / nseg
  const points: THREE.Vector3[] = [start.clone()]
  let p = start.clone()
  const d = dir.clone().normalize()
  for (let i = 0; i < nseg; i++) {
    d.addScaledVector(jitter(rng), 0.26) // uốn lượn gnarled
    d.y -= 0.06 // hơi rủ xuống như cành khô
    d.normalize()
    p = p.clone().addScaledVector(d, segLen)
    points.push(p.clone())
  }
  out.push(tubeAlong(points, base, base * 0.16, radial))

  if (depth > 0) {
    const nChild = depth >= 2 ? 2 : 1
    for (let c = 0; c < nChild; c++) {
      const idx = 1 + Math.floor((0.35 + rng() * 0.55) * (nseg - 1))
      const i0 = Math.min(idx, points.length - 1)
      const cp = points[i0]
      const stemDir = points[i0].clone().sub(points[Math.max(0, i0 - 1)]).normalize()
      // hướng cành con: lệch trục mạnh
      const perp = jitter(rng)
      perp.addScaledVector(stemDir, -perp.dot(stemDir)).normalize()
      const childDir = stemDir
        .clone()
        .multiplyScalar(0.5)
        .addScaledVector(perp, 0.95)
        .normalize()
      grow(cp, childDir, length * (0.42 + rng() * 0.22), base * 0.52, depth - 1, rng, radial, out)
    }
  }
}

export function makeBranch(opts: {
  length: number
  base: number
  depth?: number // số cấp phân nhánh (0 = thẳng 1 cành)
  radial?: number // số cạnh quanh ống
  rng?: () => number // PRNG có seed -> hệ cành tất định
}): THREE.BufferGeometry {
  const rng = opts.rng ?? Math.random
  const radial = opts.radial ?? 5
  const depth = opts.depth ?? 2
  const out: THREE.BufferGeometry[] = []
  grow(new THREE.Vector3(0, 0, 0), UP.clone(), opts.length, opts.base, depth, rng, radial, out)

  const pos: number[] = []
  const nrm: number[] = []
  for (const g of out) {
    const pp = g.attributes.position as THREE.BufferAttribute
    const np = g.attributes.normal as THREE.BufferAttribute
    for (let i = 0; i < pp.count; i++) {
      pos.push(pp.getX(i), pp.getY(i), pp.getZ(i))
      nrm.push(np.getX(i), np.getY(i), np.getZ(i))
    }
    g.dispose()
  }
  const merged = new THREE.BufferGeometry()
  merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
  merged.computeBoundingSphere()
  return merged
}

export function mergeBranches(
  branches: { geo: THREE.BufferGeometry; matrix: THREE.Matrix4 }[]
): THREE.BufferGeometry {
  const pos: number[] = []
  const nrm: number[] = []
  const v = new THREE.Vector3()
  const nm = new THREE.Matrix3()
  for (const { geo, matrix } of branches) {
    nm.getNormalMatrix(matrix)
    const pp = geo.attributes.position as THREE.BufferAttribute
    const np = geo.attributes.normal as THREE.BufferAttribute
    for (let i = 0; i < pp.count; i++) {
      v.set(pp.getX(i), pp.getY(i), pp.getZ(i)).applyMatrix4(matrix)
      pos.push(v.x, v.y, v.z)
      v.set(np.getX(i), np.getY(i), np.getZ(i)).applyMatrix3(nm)
      if (v.lengthSq() < 1e-12) v.set(0, 1, 0) // chặn pháp tuyến 0 -> NaN khi normalize
      v.normalize()
      nrm.push(v.x, v.y, v.z)
    }
    geo.dispose()
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
  out.computeBoundingSphere()
  return out
}
