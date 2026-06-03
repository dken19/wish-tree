'use client'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TIPS } from '@/lib/tree'
import { windRef } from '@/lib/runtime'
import { makeLeafCluster } from '@/lib/textures'
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

  const leaves = useMemo(() => {
    const arr: { m: THREE.Matrix4; color: number }[] = []
    const dummy = new THREE.Object3D()
    for (const t of TIPS) {
      for (let j = 0; j < perTip; j++) {
        const u = Math.random()
        const rad = 0.4 + Math.pow(u, 0.6) * 1.5
        const th = Math.random() * Math.PI * 2
        const ph = Math.acos(2 * Math.random() - 1)
        dummy.position.set(
          t[0] + rad * Math.sin(ph) * Math.cos(th),
          t[1] + rad * Math.cos(ph) * 0.9 + 0.2,
          t[2] + rad * Math.sin(ph) * Math.sin(th)
        )
        dummy.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        )
        const s = 0.6 + Math.random() * 0.6
        dummy.scale.set(s, s, s)
        dummy.updateMatrix()
        arr.push({
          m: dummy.matrix.clone(),
          color: TINTS[(Math.random() * TINTS.length) | 0],
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
      <instancedMesh ref={ref} args={[geo, mat, N]} receiveShadow />
    </group>
  )
}
