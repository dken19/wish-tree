'use client'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useCondition } from '@/store/useScene'
import { useIsMobile } from './useIsMobile'

// Cánh hoa rơi nhẹ (Points). Ẩn khi trời mưa.
export default function Petals() {
  const isMobile = useIsMobile()
  const cond = useCondition()
  const visible = cond !== 'rain'
  const N = isMobile ? 28 : 50
  const ref = useRef<THREE.Points>(null)

  const { positions, vel } = useMemo(() => {
    const pos = new Float32Array(N * 3)
    const v: { s: number; x: number }[] = []
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 5
      pos[i * 3 + 1] = Math.random() * 4 + 0.5
      pos[i * 3 + 2] = (Math.random() - 0.5) * 5
      v.push({ s: 0.2 + Math.random() * 0.3, x: Math.random() * 6 })
    }
    return { positions: pos, vel: v }
  }, [N])

  useFrame((state, dt) => {
    if (!visible || !ref.current) return
    const t = state.clock.elapsedTime
    const d = Math.min(dt, 0.05)
    for (let i = 0; i < vel.length; i++) {
      positions[i * 3 + 1] -= vel[i].s * d
      positions[i * 3] += Math.sin(t + vel[i].x) * d * 0.3
      if (positions[i * 3 + 1] < 0) {
        positions[i * 3 + 1] = 4.5
        positions[i * 3] = (Math.random() - 0.5) * 5
        positions[i * 3 + 2] = (Math.random() - 0.5) * 5
      }
    }
    ;(ref.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate =
      true
  })

  return (
    <points ref={ref} visible={visible}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={0xffb3c6}
        size={0.12}
        transparent
        opacity={0.85}
        sizeAttenuation
      />
    </points>
  )
}
