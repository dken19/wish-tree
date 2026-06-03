'use client'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TIPS, mulberry32 } from '@/lib/tree'
import { windRef } from '@/lib/runtime'
import { makeLeafCluster } from '@/lib/textures'
import { makeBranch, mergeBranches } from '@/lib/branch'
import { useIsMobile } from './useIsMobile'

// Tán sồi: RẤT NHIỀU card lá (mỗi card là một chùm lá sồi có thuỳ), xoay ngẫu
// nhiên và rải dày khắp vùng tán -> khối lá thật, không "cục tròn vo". Nhận bóng.
const TINTS = [0xffffff, 0xe6f0d4, 0xcfe0b2, 0xf2f6e2, 0xbcd29a]

export default function Foliage() {
  const isMobile = useIsMobile()
  const perTip = isMobile ? 30 : 62
  const N = TIPS.length * perTip
  const ref = useRef<THREE.InstancedMesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const tex = useMemo(() => makeLeafCluster(), [])
  const geo = useMemo(() => new THREE.PlaneGeometry(0.56, 0.56), [])
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: tex,
        alphaTest: 0.42,
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0,
      }),
    [tex]
  )

  // Cành nhỏ NÂU đỡ lá: mỗi đầu cành (TIP) mọc vài HỆ CÀNH PHÂN NHÁNH cong, gnarled
  // (lib/branch) vươn ra/rủ vào trong chùm lá -> dáng cành khô thật, không "que đũa".
  // Gộp hết thành MỘT geometry (1 draw call).
  const sysPerTip = isMobile ? 2 : 3
  const twigMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x5b432a, roughness: 0.92, metalness: 0 }),
    []
  )
  const twigGeo = useMemo(() => {
    const rng = mulberry32(0x7416c0) // seed cố định -> cành KHÔNG đổi giữa các lần load
    const up = new THREE.Vector3(0, 1, 0)
    const dir = new THREE.Vector3()
    const q = new THREE.Quaternion()
    const m = new THREE.Matrix4()
    const one = new THREE.Vector3(1, 1, 1)
    const branches: { geo: THREE.BufferGeometry; matrix: THREE.Matrix4 }[] = []
    for (const t of TIPS) {
      for (let j = 0; j < sysPerTip; j++) {
        const th = rng() * Math.PI * 2
        const el = -0.55 + rng() * 0.7 // hướng mọc: chếch xuống -> ngang (cành rủ)
        dir.set(
          Math.cos(el) * Math.cos(th),
          Math.sin(el),
          Math.cos(el) * Math.sin(th)
        ).normalize()
        const geo = makeBranch({
          length: 0.7 + rng() * 0.5,
          base: 0.03 + rng() * 0.012,
          depth: 2,
          rng,
        })
        q.setFromUnitVectors(up, dir)
        m.compose(new THREE.Vector3(t[0], t[1] + 0.1, t[2]), q, one)
        branches.push({ geo, matrix: m.clone() })
      }
    }
    return mergeBranches(branches)
  }, [sysPerTip])

  const leaves = useMemo(() => {
    const rng = mulberry32(0x1eaf01) // seed cố định -> tán lá KHÔNG đổi giữa các lần load
    const arr: { m: THREE.Matrix4; color: number }[] = []
    const dummy = new THREE.Object3D()
    for (const t of TIPS) {
      for (let j = 0; j < perTip; j++) {
        const u = rng()
        const rad = 0.4 + Math.pow(u, 0.6) * 1.5
        const th = rng() * Math.PI * 2
        const ph = Math.acos(2 * rng() - 1)
        dummy.position.set(
          t[0] + rad * Math.sin(ph) * Math.cos(th),
          t[1] + rad * Math.cos(ph) * 0.9 + 0.2,
          t[2] + rad * Math.sin(ph) * Math.sin(th)
        )
        dummy.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI)
        const s = 0.6 + rng() * 0.6
        dummy.scale.set(s, s, s)
        dummy.updateMatrix()
        arr.push({
          m: dummy.matrix.clone(),
          color: TINTS[(rng() * TINTS.length) | 0],
        })
      }
    }
    return arr
  }, [perTip])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const col = new THREE.Color()
    leaves.forEach((l, i) => {
      mesh.setMatrixAt(i, l.m)
      mesh.setColorAt(i, col.set(l.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [leaves])

  // cả tán đung đưa nhẹ theo gió (rẻ: chỉ xoay group)
  useFrame((state) => {
    const grp = groupRef.current
    if (!grp) return
    const t = state.clock.elapsedTime
    const w = windRef.current
    grp.rotation.z = Math.sin(t * 0.9) * 0.016 * w
    grp.rotation.x = Math.cos(t * 0.7) * 0.011 * w
  })

  return (
    <group ref={groupRef}>
      <mesh geometry={twigGeo} material={twigMat} castShadow />
      <instancedMesh ref={ref} args={[geo, mat, N]} receiveShadow />
    </group>
  )
}
