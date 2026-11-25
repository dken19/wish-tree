'use client'
import { useMemo } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useIsMobile } from './useIsMobile'
import { SHRINE_POS } from './Shrine'
import { POND } from '@/lib/roomMap'

// Asset scan thật (Poly Haven, CC0) cho phòng Rừng Trúc — đã nén sẵn ở public/room:
// glb giảm lưới (gltf-transform simplify) + texture WebP 512. Tổng ~0,9 MB, tải lười khi vào phòng.
const TAU = Math.PI * 2

function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

/** Nền sỏi scan (floor_pebbles_01) + sân lát đá (stone_tiles) dưới bàn thờ và lối dẫn tới. */
export function RoomFloor() {
  const [pebD, pebN, tileD, tileN] = useTexture([
    '/room/floor_pebbles_01_diff.webp',
    '/room/floor_pebbles_01_nor.webp',
    '/room/stone_tiles_diff.webp',
    '/room/stone_tiles_nor.webp',
  ])
  useMemo(() => {
    for (const t of [pebD, pebN]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(26, 26)
      t.anisotropy = 4
    }
    for (const t of [tileD, tileN]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(2.2, 2.2)
    }
    pebD.colorSpace = THREE.SRGBColorSpace
    tileD.colorSpace = THREE.SRGBColorSpace
  }, [pebD, pebN, tileD, tileN])

  // lối đá: từ mép vòng người ngồi tới bệ tượng
  const dir = SHRINE_POS.clone().setY(0).normalize()
  const len = SHRINE_POS.length() - 4.3
  const mid = dir.clone().multiplyScalar(4.3 + len / 2)
  const pathTile = useMemo(() => {
    const t = tileD.clone()
    t.repeat.set(1, len / 1.1)
    t.needsUpdate = true
    return t
  }, [tileD, len])

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[28, 64]} />
        <meshStandardMaterial map={pebD} normalMap={pebN} normalScale={new THREE.Vector2(0.9, 0.9)} roughness={0.95} color={0xd9d6cc} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[SHRINE_POS.x, 0.006, SHRINE_POS.z]} receiveShadow>
        <circleGeometry args={[1.9, 40]} />
        <meshStandardMaterial map={tileD} normalMap={tileN} roughness={0.9} color={0xcfccc2} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} rotation-z={Math.atan2(dir.x, dir.z) + Math.PI} position={[mid.x, 0.004, mid.z]} receiveShadow>
        <planeGeometry args={[1.1, len]} />
        <meshStandardMaterial map={pathTile} normalMap={tileN} roughness={0.9} color={0xcfccc2} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
    </group>
  )
}

type PlantSpec = { url: string; count: number; h: [number, number]; rMin: number; rMax: number; seed: number }
const PLANTS: PlantSpec[] = [
  { url: '/room/shrub_04.glb', count: 7, h: [1.3, 2.1], rMin: 7, rMax: 12, seed: 11 }, // cây bụi lớn, đứng cạnh gốc trúc
  { url: '/room/shrub_03.glb', count: 10, h: [0.6, 1.0], rMin: 5.2, rMax: 10, seed: 23 },
  { url: '/room/fern_02.glb', count: 14, h: [0.45, 0.75], rMin: 4.8, rMax: 9, seed: 37 },
]

function PlantSet({ spec, mobile }: { spec: PlantSpec; mobile: boolean }) {
  const gltf = useGLTF(spec.url)
  const { geo, mat } = useMemo(() => {
    gltf.scene.updateMatrixWorld(true)
    let mesh: THREE.Mesh | null = null
    gltf.scene.traverse((o) => {
      if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh
    })
    const m = mesh as unknown as THREE.Mesh
    const g = m.geometry.clone().applyMatrix4(m.matrixWorld)
    g.computeBoundingBox()
    const material = (m.material as THREE.MeshStandardMaterial).clone()
    material.side = THREE.DoubleSide
    if (material.transparent) {
      // lá cắt alpha: dùng alphaTest thay blend -> không lỗi thứ tự vẽ
      material.transparent = false
      material.alphaTest = 0.5
    }
    return { geo: g, mat: material }
  }, [gltf])

  const n = mobile ? Math.ceil(spec.count / 2) : spec.count
  const ref = (inst: THREE.InstancedMesh | null) => {
    if (!inst) return
    const box = geo.boundingBox!
    const baseH = Math.max(0.01, box.max.y - box.min.y)
    const r = rng(spec.seed)
    const shrineA = Math.atan2(SHRINE_POS.z, SHRINE_POS.x)
    const d = new THREE.Object3D()
    let i = 0
    let guard = 0
    while (i < n && guard++ < 400) {
      const a = r() * TAU
      const rad = spec.rMin + r() * (spec.rMax - spec.rMin)
      // chừa khoảng trước bàn thờ + lối đi
      let da = Math.abs(a - shrineA) % TAU
      if (da > Math.PI) da = TAU - da
      if (da < 0.42 && rad < 9.5) continue
      const px = Math.cos(a) * rad
      const pz = Math.sin(a) * rad
      if (Math.hypot(px - POND.x, pz - POND.z) < POND.r + 0.7) continue
      const h = spec.h[0] + r() * (spec.h[1] - spec.h[0])
      const s = h / baseH
      d.position.set(Math.cos(a) * rad, -box.min.y * s, Math.sin(a) * rad)
      d.rotation.set(0, r() * TAU, 0)
      d.scale.setScalar(s)
      d.updateMatrix()
      inst.setMatrixAt(i++, d.matrix)
    }
    inst.count = i
    inst.instanceMatrix.needsUpdate = true
  }
  return <instancedMesh key={n} ref={ref} args={[geo, mat, n]} receiveShadow />
}

export function RoomPlants() {
  const mobile = useIsMobile()
  return (
    <group>
      {PLANTS.map((p) => (
        <PlantSet key={p.url} spec={p} mobile={mobile} />
      ))}
    </group>
  )
}
