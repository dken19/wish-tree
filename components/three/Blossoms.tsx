'use client'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { TIPS } from '@/lib/tree'
import { useIsMobile } from './useIsMobile'

const PALETTE = [0xffd6e0, 0xffb3c6, 0xff8fab, 0xffe0ec, 0xffffff]

// Hoa low-poly trang trí quanh tán (InstancedMesh, không tương tác).
export default function Blossoms() {
  const isMobile = useIsMobile()
  const N = isMobile ? 150 : 300
  const ref = useRef<THREE.InstancedMesh>(null)

  const data = useMemo(() => {
    const arr: { p: THREE.Vector3; s: number; rot: THREE.Euler; color: number }[] =
      []
    for (let i = 0; i < N; i++) {
      const t = TIPS[i % TIPS.length]
      const p = new THREE.Vector3(
        t[0] + (Math.random() - 0.5) * 1.1 + (Math.random() - 0.5) * 0.3,
        t[1] + (Math.random() - 0.2) * 0.7 - 0.1 + (Math.random() - 0.2) * 0.3,
        t[2] + (Math.random() - 0.5) * 1.1 + (Math.random() - 0.5) * 0.3
      )
      const s = 0.6 + Math.random() * 0.9
      const rot = new THREE.Euler(
        Math.random() * 6,
        Math.random() * 6,
        Math.random() * 6
      )
      arr.push({ p, s, rot, color: PALETTE[(Math.random() * PALETTE.length) | 0] })
    }
    return arr
  }, [N])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    const col = new THREE.Color()
    data.forEach((d, i) => {
      dummy.position.copy(d.p)
      dummy.scale.setScalar(d.s)
      dummy.rotation.copy(d.rot)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, col.setHex(d.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [data])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]}>
      <icosahedronGeometry args={[0.14, 0]} />
      <meshLambertMaterial flatShading />
    </instancedMesh>
  )
}
