'use client'
import { useMemo } from 'react'
import * as THREE from 'three'
import { ALL_BRANCHES } from '@/lib/tree'

// Thân + cành low-poly. Mỗi đoạn là một cylinder định hướng từ a -> b.
export default function Tree() {
  const segments = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0)
    return ALL_BRANCHES.map((br) => {
      const a = new THREE.Vector3(...br.a)
      const b = new THREE.Vector3(...br.b)
      const dir = new THREE.Vector3().subVectors(b, a)
      const len = dir.length()
      const mid = a.clone().add(b).multiplyScalar(0.5)
      const quat = new THREE.Quaternion().setFromUnitVectors(
        up,
        dir.clone().normalize()
      )
      return {
        position: mid.toArray() as [number, number, number],
        quaternion: [quat.x, quat.y, quat.z, quat.w] as [
          number,
          number,
          number,
          number
        ],
        len,
        r0: br.r0,
        r1: br.r1,
      }
    })
  }, [])

  return (
    <group>
      {segments.map((s, i) => (
        <mesh key={i} position={s.position} quaternion={s.quaternion}>
          <cylinderGeometry args={[s.r1, s.r0, s.len, 6, 1]} />
          <meshLambertMaterial color={0x6b5135} flatShading />
        </mesh>
      ))}
    </group>
  )
}
