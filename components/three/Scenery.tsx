'use client'
import { useMemo } from 'react'
import * as THREE from 'three'
import { groundHeight } from '@/lib/terrain'
import { mulberry32 } from '@/lib/tree'
import { TEMPLE_ANG, fbm } from '@/lib/farTerrain'
import { useIsMobile } from './useIsMobile'
import Monastery from './Monastery'
import FarLands from './FarLands'

// Cảnh quanh đỉnh: rừng thông trên sườn, xóm nhỏ, thiền viện + FarLands (dãy núi xa liền mạch).
const TAU = Math.PI * 2

export default function Scenery() {
  const isMobile = useIsMobile()

  // THÔNG NHỎ rải XUỐNG SƯỜN núi (r 24..60): ngoài vòng quỹ đạo camera (r ≤ 19) nên không bao giờ
  // che mặt/đâm xuyên camera; cây nhỏ (cao ~1,5–3m) để đỉnh núi + cây ước là điểm nhấn. Né lối đá về
  // thiền viện và xóm nhà. Mọc thành cụm (noise) cho tự nhiên. Seed cố định -> không đổi giữa các lần load.
  const pineCount = isMobile ? 130 : 280
  const pineData = useMemo(() => {
    const rng = mulberry32(0x9143 + pineCount)
    const arr: { p: THREE.Vector3; s: number; yaw: number }[] = []
    for (let k = 0; k < pineCount * 8 && arr.length < pineCount; k++) {
      const a = rng() * TAU
      const r = 24 + Math.pow(rng(), 0.8) * 36
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      const dPath = Math.abs(((a - TEMPLE_ANG + Math.PI * 3) % TAU) - Math.PI) * r
      if (dPath < 4) continue
      if (VILLAGE_SPOTS.some((v) => Math.hypot(x - Math.cos(v.a) * v.r, z - Math.sin(v.a) * v.r) < 4)) continue
      if (fbm(x / 14, z / 14, 2, 41) < 0.42) continue // mọc theo cụm
      arr.push({
        p: new THREE.Vector3(x, groundHeight(x, z) - 0.08, z),
        s: 0.5 + rng() * 0.4, // cùng cỡ thật ở mọi khoảng cách (luật gần xa)
        yaw: rng() * TAU,
      })
    }
    return arr
  }, [pineCount])

  return (
    <group>
      {/* Dãy núi xa LIỀN MẠCH + rừng + bản làng (địa hình chung farHeight) */}
      <FarLands />

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

const VILLAGE_SPOTS: { a: number; r: number; rot: number; roof: number }[] = [
  { a: -1.0, r: 25, rot: 0.4, roof: 0xc2683f },
  { a: -1.28, r: 28.5, rot: -0.5, roof: 0xb9603a },
  { a: -0.72, r: 30, rot: 0.9, roof: 0xcf7a48 },
]

// XÓM NHỎ Ở XA: vài nóc nhà nép dưới sườn/thung lũng, ngồi đúng địa hình -> đọc
// như một bản làng đằng xa, KHÔNG nằm cạnh cây.
function Village() {
  const houses = useMemo(() => {
    return VILLAGE_SPOTS.map((s) => {
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
