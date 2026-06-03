'use client'
import { useMemo } from 'react'
import * as THREE from 'three'
import { ALL_BRANCHES } from '@/lib/tree'
import { makeBark } from '@/lib/textures'

// Thân + cành cổ thụ: ống LIỀN MẠCH thuôn dần dọc đường GẤP KHÚC (CatmullRom qua
// nhiều điểm). Bề mặt thêm nhiễu dọc + nhiễu quanh chu vi -> vỏ cây sần sùi, u
// nần, thể hiện cây nhiều năm tuổi. flatShading cho cảm giác craggy.
const TAU = Math.PI * 2

function tube(
  curve: THREE.Curve<THREE.Vector3>,
  r0: number,
  r1: number,
  radial: number,
  seed: number,
  rough: number
): THREE.BufferGeometry {
  const len = curve.getLength()
  const tubular = Math.max(8, Math.min(64, Math.round(len * 6)))
  const frames = curve.computeFrenetFrames(tubular, false)
  const pts = curve.getPoints(tubular)
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []

  for (let i = 0; i <= tubular; i++) {
    const P = pts[i]
    const N = frames.normals[i]
    const B = frames.binormals[i]
    const t = i / tubular
    // u nần dọc thân (tần số thấp + cao), mượt nên không gãy bậc
    const along =
      1 +
      (Math.sin(t * 6 + seed) * 0.06 + Math.sin(t * 17 + seed * 2.3) * 0.035) * rough
    const baseR = THREE.MathUtils.lerp(r0, r1, t) * along
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * TAU
      // gờ/rãnh vỏ cây quanh chu vi -> méo, sần
      const bark = 1 + (Math.sin(a * 5 + t * 9 + seed) * 0.05 + Math.sin(a * 11) * 0.03) * rough
      const r = baseR * bark
      const cx = Math.cos(a)
      const sx = Math.sin(a)
      pos.push(
        P.x + (cx * N.x + sx * B.x) * r,
        P.y + (cx * N.y + sx * B.y) * r,
        P.z + (cx * N.z + sx * B.z) * r
      )
      // UV: u quanh chu vi (lặp 2 vòng), v dọc thân (tỉ lệ theo chiều dài) -> vỏ tile đều
      uv.push((j / radial) * 2, t * len * 1.6)
    }
  }
  for (let i = 0; i < tubular; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j
      const b = i * radial + ((j + 1) % radial)
      const c = (i + 1) * radial + j
      const d = (i + 1) * radial + ((j + 1) % radial)
      idx.push(a, c, b, b, c, d)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

export default function Tree() {
  const geometry = useMemo(() => {
    const parts: THREE.BufferGeometry[] = []

    ALL_BRANCHES.forEach((br, bi) => {
      const vecs = br.pts.map((p) => new THREE.Vector3(...p))
      const curve = new THREE.CatmullRomCurve3(vecs, false, 'catmullrom', 0.5)
      const isTrunk = bi === 0
      const radial = isTrunk ? 13 : br.r0 > 0.2 ? 9 : 7
      const rough = isTrunk ? 1.5 : br.r0 > 0.2 ? 1.0 : 0.5
      parts.push(tube(curve, br.r0, br.r1, radial, bi * 1.7 + 0.5, rough).toNonIndexed())

      // cục nối u sần ở GỐC cành để bịt chạc -> phình tự nhiên
      const a = vecs[0]
      const blob = new THREE.IcosahedronGeometry(br.r0 * 1.2, 1)
      blob.translate(a.x, a.y, a.z)
      blob.computeVertexNormals()
      parts.push(blob) // IcosahedronGeometry vốn đã non-indexed
    })

    const merged = mergeGeometries(parts)
    parts.forEach((g) => g.dispose())
    return merged
  }, [])

  const bark = useMemo(() => makeBark(), [])

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        map={bark.map}
        normalMap={bark.normal}
        normalScale={new THREE.Vector2(1.1, 1.1)}
        color={0x8a6a48}
        roughness={0.92}
        metalness={0}
      />
    </mesh>
  )
}

function mergeGeometries(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let vTotal = 0
  for (const g of list) vTotal += g.attributes.position.count
  const pos = new Float32Array(vTotal * 3)
  const nor = new Float32Array(vTotal * 3)
  const uvs = new Float32Array(vTotal * 2)
  let off = 0
  for (const g of list) {
    const gp = g.attributes.position.array as Float32Array
    const gn = g.attributes.normal?.array as Float32Array | undefined
    const gu = g.attributes.uv?.array as Float32Array | undefined
    const n = g.attributes.position.count
    pos.set(gp, off * 3)
    if (gn) nor.set(gn, off * 3)
    if (gu) uvs.set(gu, off * 2)
    off += n
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  out.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  return out
}
