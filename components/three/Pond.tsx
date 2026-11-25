'use client'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { POND } from '@/lib/roomMap'

const TAU = Math.PI * 2

// Ao sen nhỏ trong rừng trúc (điểm đến khi đi dạo): mặt nước + bờ đá + lá sen + vài bông sen hồng.
export default function Pond() {
  const water = useRef<THREE.MeshStandardMaterial>(null)
  const pads = useMemo(() => {
    let s = 77
    const r = () => {
      s = (s * 16807) % 2147483647
      return s / 2147483647
    }
    return Array.from({ length: 11 }, () => {
      const a = r() * TAU
      const d = 0.4 + r() * (POND.r - 0.7)
      return { x: Math.cos(a) * d, z: Math.sin(a) * d, s: 0.22 + r() * 0.18, rot: r() * TAU, flower: r() < 0.35 }
    })
  }, [])
  const padGeo = useMemo(() => new THREE.CircleGeometry(1, 20, 0.35, TAU - 0.35), [])
  const rocks = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * TAU
        return { x: Math.cos(a) * (POND.r + 0.12), z: Math.sin(a) * (POND.r + 0.12), s: 0.18 + ((i * 37) % 10) / 60 }
      }),
    []
  )

  useFrame((state) => {
    if (water.current) water.current.roughness = 0.12 + Math.sin(state.clock.elapsedTime * 0.7) * 0.03
  })

  return (
    <group position={[POND.x, 0, POND.z]}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.03} receiveShadow>
        <circleGeometry args={[POND.r, 48]} />
        <meshStandardMaterial ref={water} color={0x2f4f4a} roughness={0.12} metalness={0.25} />
      </mesh>
      {/* bờ đá */}
      {rocks.map((k, i) => (
        <mesh key={i} position={[k.x, k.s * 0.35, k.z]} scale={[k.s * 1.4, k.s * 0.7, k.s]} rotation-y={i} castShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={0x8e8b80} roughness={0.95} flatShading />
        </mesh>
      ))}
      {/* lá sen + hoa */}
      {pads.map((p, i) => (
        <group key={i} position={[p.x, 0.045, p.z]} rotation-y={p.rot}>
          <mesh geometry={padGeo} rotation-x={-Math.PI / 2} scale={p.s}>
            <meshStandardMaterial color={0x4f8a3e} roughness={0.6} side={THREE.DoubleSide} />
          </mesh>
          {p.flower && (
            <group position={[0, 0.03, 0]}>
              {Array.from({ length: 8 }, (_, j) => (
                <group key={j} rotation-y={(j / 8) * TAU} position={[0, 0.06, 0]}>
                  <mesh position={[0, 0, 0.06]} rotation-x={0.55 + (j % 2) * 0.25} scale={[0.045, 0.11, 0.02]}>
                    <sphereGeometry args={[1, 8, 6]} />
                    <meshStandardMaterial color={j % 2 ? 0xf6b8c8 : 0xee9bb2} roughness={0.5} />
                  </mesh>
                </group>
              ))}
              <mesh position={[0, 0.09, 0]}>
                <cylinderGeometry args={[0.03, 0.025, 0.03, 10]} />
                <meshStandardMaterial color={0xf2d35a} roughness={0.6} />
              </mesh>
            </group>
          )}
        </group>
      ))}
    </group>
  )
}
