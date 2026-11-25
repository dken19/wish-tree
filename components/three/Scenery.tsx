'use client'
import { useMemo } from 'react'
import * as THREE from 'three'
import { groundHeight } from '@/lib/terrain'
import { RINGS, VALLEY_FLOOR } from '@/lib/peaks'
import { mulberry32 } from '@/lib/tree'
import { useIsMobile } from './useIsMobile'
import Monastery from './Monastery'

// Cảnh xa: VÀI dãy núi xanh (rừng phủ) THẤP & XA hơn đỉnh ta đứng, mờ vào sương.
const TAU = Math.PI * 2

// gradient theo độ cao: rừng tối -> rừng sáng -> đá xám lam -> tuyết
const C_FOREST_LO = new THREE.Color(0x35522f)
const C_FOREST_HI = new THREE.Color(0x5c7d42)
const C_ROCK = new THREE.Color(0x6b7686)
const C_SNOW = new THREE.Color(0xeef3f8)
const LIGHT_DIR = new THREE.Vector3(0.45, 0.72, 0.5).normalize()

function mountainColor(out: THREE.Color, fy: number, tall: boolean) {
  if (fy < 0.5) {
    out.copy(C_FOREST_LO).lerp(C_FOREST_HI, fy / 0.5)
  } else if (fy < 0.8) {
    out.copy(C_FOREST_HI).lerp(C_ROCK, (fy - 0.5) / 0.3)
  } else {
    out.copy(C_ROCK)
    if (tall) out.lerp(C_SNOW, (fy - 0.8) / 0.2)
  }
}

// Núi đá vôi (karst): nón được UỐN TRÒN thành vòm — sườn vẫn dốc nhưng đỉnh
// KHÔNG nhọn như kim; thêm nhiễu nhẹ theo góc/độ cao cho sống núi/khe gồ ghề.
function makePeak(baseR: number, height: number, seed: number): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(baseR, height, 14, 8)
  const p = g.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const y = p.getY(i)
    const z = p.getZ(i)
    const ang = Math.atan2(z, x)
    const fy = THREE.MathUtils.clamp((y + height / 2) / height, 0, 1)
    // remap bán kính nón (tuyến tính) -> vòm tròn: vai núi đầy đặn, đỉnh bo tròn
    const linRad = baseR * (1 - fy)
    const domeRad = baseR * Math.pow(Math.max(0, 1 - Math.pow(fy, 2.3)), 0.6)
    const shape = linRad > 1e-3 ? Math.min(domeRad / linRad, 2.6) : 1
    const n =
      Math.sin(ang * 3 + seed) * 0.5 +
      Math.sin(ang * 7 + fy * 5 + seed * 1.7) * 0.3 +
      Math.sin(ang * 13 + seed * 2.3) * 0.2
    const k = shape * (1 + n * 0.24 * (1 - fy * 0.45))
    p.setX(i, x * k)
    p.setZ(i, z * k)
    p.setY(i, y + Math.sin(ang * 5 + seed) * 0.5 * height * 0.03)
  }
  g.computeVertexNormals()
  return g
}

export default function Scenery() {
  const isMobile = useIsMobile()

  const mountainGeo = useMemo(() => {
    const positions: number[] = []
    const colors: number[] = []
    // ÍT núi: 2 lớp, lớp xa nhiều hơn chút. Đỉnh đều THẤP hơn ta (top < ~0).
    const rings = RINGS
    const col = new THREE.Color()
    const nrm = new THREE.Vector3()
    rings.forEach((ring, ri) => {
      for (let i = 0; i < ring.n; i++) {
        const a = (i / ring.n) * TAU + (i * 2.3 + ri * 1.9) * 0.21
        const r = ring.r + ((Math.sin(i * 53.7 + ri * 11.3) + 1) / 2) * ring.rj
        const height = ring.h0 + ((Math.sin(i * 19.1 + ri) + 1) / 2) * ring.hj
        const baseR = ring.base + ((Math.cos(i * 7.3) + 1) / 2) * 6
        const seed = i * 3.1 + ri * 7.7
        const tall = height > ring.snowAt
        const peak = makePeak(baseR, height, seed).toNonIndexed()
        const pp = peak.attributes.position as THREE.BufferAttribute
        const pn = peak.attributes.normal as THREE.BufferAttribute
        const sx = 0.9 + ((Math.sin(seed) + 1) / 2) * 0.5
        const sz = 0.9 + ((Math.cos(seed) + 1) / 2) * 0.5
        const cx = Math.cos(a) * r
        const cz = Math.sin(a) * r
        const baseY = VALLEY_FLOOR + height / 2
        for (let v = 0; v < pp.count; v++) {
          const x = pp.getX(v) * sx
          const y = pp.getY(v)
          const z = pp.getZ(v) * sz
          positions.push(cx + x, baseY + y, cz + z)
          const fy = (y + height / 2) / height
          mountainColor(col, THREE.MathUtils.clamp(fy, 0, 1), tall)
          nrm.set(pn.getX(v), pn.getY(v), pn.getZ(v))
          const shade = 0.62 + 0.38 * Math.max(0, nrm.dot(LIGHT_DIR))
          colors.push(col.r * shade, col.g * shade, col.b * shade)
        }
        peak.dispose()
      }
    })
    const out = new THREE.BufferGeometry()
    out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    out.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    return out
  }, [])

  // RỪNG THÔNG XA: phủ kín sườn núi + thung lũng quanh đỉnh (r 16..60), KHÔNG
  // chạm vùng cây/cỏ ở giữa. Ngồi đúng cao độ địa hình (terrainHeight) nên không
  // lơ lửng. Càng xa scale càng lớn để vẫn đọc được qua sương.
  const pineCount = isMobile ? 70 : 150
  const pineData = useMemo(() => {
    const rng = mulberry32(0x9143 + pineCount) // seed cố định -> rừng thông KHÔNG đổi
    const arr: { p: THREE.Vector3; s: number; yaw: number }[] = []
    for (let i = 0; i < pineCount; i++) {
      const a = rng() * TAU
      const r = 16 + rng() * 44
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      const grow = (r - 16) / 44 // 0 gần -> 1 xa
      arr.push({
        p: new THREE.Vector3(x, groundHeight(x, z) - 0.1, z),
        s: 1.4 + grow * 1.9 + rng() * 0.7,
        yaw: rng() * TAU,
      })
    }
    return arr
  }, [pineCount])

  return (
    <group>
      {/* Núi xa xanh, unlit + vertex color (đã baked sáng) + sương mù */}
      <mesh geometry={mountainGeo}>
        <meshBasicMaterial vertexColors />
      </mesh>

      <Pines data={pineData} />
      <Village />
      <Monastery />
    </group>
  )
}

// Cây thông nhiều tầng: thân nâu + 5 tầng tán. Mép mỗi tầng LỞM CHỞM (đỉnh nhọn chĩa ra/xuống như đầu
// cành), tầng dưới rộng/tối, lên cao hẹp/sáng; trong lõi tối hơn mép (vertex color). Mỗi cây 1 sắc xanh
// riêng qua instanceColor. Vẫn 1 draw call cho cả rừng.
function makeConifer(): THREE.BufferGeometry {
  const pos: number[] = []
  const col: number[] = []
  const c = new THREE.Color()
  const tri = (a: number[], b: number[], d: number[], ca: number, cb: number, cd: number) => {
    pos.push(...a, ...b, ...d)
    for (const k of [ca, cb, cd]) col.push(c.r * k, c.g * k, c.b * k)
  }
  // thân
  c.set(0x5b4327)
  const trunk = new THREE.CylinderGeometry(0.07, 0.12, 0.7, 6).toNonIndexed()
  trunk.translate(0, 0.35, 0)
  const tp = trunk.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < tp.count; i += 3)
    tri([tp.getX(i), tp.getY(i), tp.getZ(i)], [tp.getX(i + 1), tp.getY(i + 1), tp.getZ(i + 1)], [tp.getX(i + 2), tp.getY(i + 2), tp.getZ(i + 2)], 1, 1, 1)
  trunk.dispose()
  // tầng tán: chóp ở trên, vành dưới 2*SEG đỉnh luân phiên (mũi cành dài, chỗ lõm ngắn)
  const TIERS = 5
  const SEG = 8
  let seed = 3
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let t = 0; t < TIERS; t++) {
    const k = t / (TIERS - 1)
    const y0 = 0.55 + t * 0.42
    const h = 0.95 - k * 0.25
    const r = 0.82 - k * 0.5
    c.set(0x2f5a2c).lerp(new THREE.Color(0x5a8a4a), k * 0.8)
    const apex = [0, y0 + h, 0]
    const ring: number[][] = []
    for (let i = 0; i < SEG * 2; i++) {
      const a = (i / (SEG * 2)) * Math.PI * 2 + t * 0.4
      const tip = i % 2 === 0
      const rr = tip ? r * (0.95 + rnd() * 0.25) : r * 0.62
      const yy = tip ? y0 - 0.08 - rnd() * 0.06 : y0 + 0.1 // mũi cành rủ xuống
      ring.push([Math.cos(a) * rr, yy, Math.sin(a) * rr])
    }
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i]
      const q = ring[(i + 1) % ring.length]
      // mặt ngoài: chóp sáng, vành tối (bóng dưới tán)
      tri(apex, q, p, 1.12, 0.78, 0.78)
      // mặt dưới tán (nhìn từ thấp lên): tối
      tri([0, y0 + 0.05, 0], p, q, 0.45, 0.6, 0.6)
    }
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  out.computeVertexNormals()
  return out
}

const PINE_TINTS = [0xffffff, 0xe6f0dc, 0xd2e2c2, 0xf2f6e2, 0xc6d8be]

function Pines({ data }: { data: { p: THREE.Vector3; s: number; yaw: number }[] }) {
  const N = data.length
  const geo = useMemo(() => makeConifer(), [])
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, flatShading: true }),
    []
  )
  const ref = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return
    const dummy = new THREE.Object3D()
    const col = new THREE.Color()
    data.forEach((d, i) => {
      dummy.position.set(d.p.x, d.p.y, d.p.z)
      dummy.rotation.set(0, d.yaw, 0)
      dummy.scale.set(d.s, d.s * (0.95 + (i % 3) * 0.12), d.s)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, col.set(PINE_TINTS[(i * 7) % PINE_TINTS.length]))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }
  return <instancedMesh ref={ref} args={[geo, mat, N]} castShadow receiveShadow />
}

function House({
  position,
  rotation = 0,
  scale = 1,
  roof = 0xc2683f,
  wall = 0xeadcc6,
}: {
  position: [number, number, number]
  rotation?: number
  scale?: number
  roof?: number
  wall?: number
}) {
  return (
    <group position={position} rotation-y={rotation} scale={scale}>
      <mesh position-y={0.4} castShadow receiveShadow>
        <boxGeometry args={[1, 0.8, 0.9]} />
        <meshStandardMaterial color={wall} roughness={0.9} />
      </mesh>
      <mesh position-y={1.0} rotation-y={Math.PI / 4} castShadow>
        <coneGeometry args={[0.85, 0.6, 4]} />
        <meshStandardMaterial color={roof} roughness={0.85} />
      </mesh>
    </group>
  )
}

// XÓM NHỎ Ở XA: vài nóc nhà nép dưới sườn/thung lũng, ngồi đúng địa hình -> đọc
// như một bản làng đằng xa, KHÔNG nằm cạnh cây.
function Village() {
  const houses = useMemo(() => {
    const spots: { a: number; r: number; rot: number; roof: number }[] = [
      { a: -1.0, r: 25, rot: 0.4, roof: 0xc2683f },
      { a: -1.28, r: 28.5, rot: -0.5, roof: 0xb9603a },
      { a: -0.72, r: 30, rot: 0.9, roof: 0xcf7a48 },
    ]
    return spots.map((s) => {
      const x = Math.cos(s.a) * s.r
      const z = Math.sin(s.a) * s.r
      return {
        pos: [x, groundHeight(x, z) - 0.05, z] as [number, number, number],
        rot: s.rot,
        roof: s.roof,
      }
    })
  }, [])
  return (
    <group>
      {houses.map((h, i) => (
        <House key={i} position={h.pos} rotation={h.rot} scale={1.7} roof={h.roof} />
      ))}
    </group>
  )
}
