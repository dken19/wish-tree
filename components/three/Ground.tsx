'use client'
import { useMemo } from 'react'
import * as THREE from 'three'
import { makeGrass } from '@/lib/textures'
import { terrainHeight, groundHeight, GROUND_SIZE, GROUND_SEG } from '@/lib/terrain'
import { makeRock } from '@/lib/rock'
import { mulberry32 } from '@/lib/tree'

// ĐỈNH NÚI: đỉnh phẳng (nơi cây/cỏ/bàn), rìa GỒ GHỀ không tròn đều, sườn đổ dốc
// xuống thung lũng sâu có sống núi/khe. Sườn có vệt màu đậm-nhạt + rải đá tảng.
// Cao độ địa hình ở lib/terrain.ts (dùng chung với Scenery để đặt thông/nhà).

export default function Ground() {
  const grass = useMemo(() => {
    const g = makeGrass()
    g.map.repeat.set(60, 60)
    g.normal.repeat.set(60, 60)
    return g
  }, [])

  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE, GROUND_SEG, GROUND_SEG)
    const p = g.attributes.position as THREE.BufferAttribute
    const colors = new Float32Array(p.count * 3)
    // tint nhạt (nhân với texture cỏ) -> chỉ điều sắc, không làm tối
    const top = new THREE.Color(0xf2f7e8) // cỏ đỉnh tươi sáng
    const slope = new THREE.Color(0xc4d6a0) // sườn xanh hơi đậm
    const rock = new THREE.Color(0xd8cda4) // chỗ dốc/đá khô ngả vàng
    const col = new THREE.Color()
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i)
      const z = p.getY(i)
      const h = terrainHeight(x, z)
      p.setZ(i, h)
      // màu theo độ sâu + đốm khô ngẫu nhiên -> sườn không phẳng một màu
      const depth = THREE.MathUtils.clamp(-h / 28, 0, 1)
      col.copy(top).lerp(slope, THREE.MathUtils.clamp(depth * 1.5, 0, 1))
      const dry = Math.sin(x * 0.4 + 1.3) * Math.sin(z * 0.37) * 0.5 + 0.5
      if (depth > 0.25) col.lerp(rock, depth * dry * 0.5)
      colors[i * 3] = col.r
      colors[i * 3 + 1] = col.g
      colors[i * 3 + 2] = col.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.rotateX(-Math.PI / 2)
    g.computeVertexNormals()
    return g
  }, [])

  // Tảng đá rải rìa đỉnh + sườn, LÚN một phần vào đất (không nằm hờ trên cỏ).
  // PRNG có seed cố định -> vị trí/hình đá KHÔNG đổi giữa các lần load.
  const rocks = useMemo(() => {
    const rng = mulberry32(0x20c4)
    const arr: {
      pos: [number, number, number]
      s: number
      rot: [number, number, number]
      seed: number
    }[] = []
    for (let i = 0; i < 18; i++) {
      const a = rng() * Math.PI * 2
      // r >= 16: NGOÀI hẳn rìa đỉnh phẳng (rEdge tối đa ~11.3) -> đá nằm trên sườn,
      // KHÔNG bao giờ rơi vào đỉnh cạnh gốc cây.
      const r = 16 + rng() * 18
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      const s = 0.55 + rng() * 1.2
      arr.push({
        // lún ~25% chiều cao -> tảng đá "mọc" lên từ đất, đọc như một khối
        pos: [x, groundHeight(x, z) - s * 0.25, z],
        s,
        rot: [(rng() - 0.5) * 0.4, rng() * Math.PI * 2, (rng() - 0.5) * 0.4],
        seed: (rng() * 1e9) >>> 0, // seed hình tảng đá (tất định)
      })
    }
    return arr
  }, [])

  return (
    <group>
      <mesh geometry={geo} receiveShadow>
        <meshStandardMaterial
          map={grass.map}
          normalMap={grass.normal}
          normalScale={new THREE.Vector2(0.7, 0.7)}
          vertexColors
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* gò đất nhỏ ngay chân cây */}
      <mesh position-y={groundHeight(0, 0) - 0.12} receiveShadow>
        <coneGeometry args={[1.7, 0.5, 16]} />
        <meshStandardMaterial color={0x7d6b46} roughness={1} metalness={0} />
      </mesh>

      <Rocks data={rocks} />
    </group>
  )
}

const ROCK_MAT = new THREE.MeshStandardMaterial({
  color: 0x8d8472,
  roughness: 0.95,
  metalness: 0,
  flatShading: true,
})

// Một tảng đá: hình theo `seed` (truyền vào) -> liền khối, kín, và TẤT ĐỊNH —
// cùng seed thì luôn ra đúng một dáng, cảnh không đổi giữa các lần load.
function Rock({
  pos,
  s,
  rot,
  seed,
}: {
  pos: [number, number, number]
  s: number
  rot: [number, number, number]
  seed: number
}) {
  const geo = useMemo(() => makeRock(seed), [seed])
  return (
    <mesh
      geometry={geo}
      material={ROCK_MAT}
      position={pos}
      rotation={rot}
      scale={s}
      castShadow
      receiveShadow
    />
  )
}

function Rocks({
  data,
}: {
  data: {
    pos: [number, number, number]
    s: number
    rot: [number, number, number]
    seed: number
  }[]
}) {
  return (
    <group>
      {data.map((d, i) => (
        <Rock key={i} pos={d.pos} s={d.s} rot={d.rot} seed={d.seed} />
      ))}
    </group>
  )
}
