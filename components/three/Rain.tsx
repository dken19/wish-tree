'use client'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useCondition } from '@/store/useScene'
import { useIsMobile } from './useIsMobile'

// Mưa (LineSegments). Chỉ hiện khi điều kiện = rain.
export default function Rain() {
  const isMobile = useIsMobile()
  const cond = useCondition()
  const visible = cond === 'rain'
  const N = isMobile ? 120 : 240
  const ref = useRef<THREE.LineSegments>(null)

  const positions = useMemo(() => {
    const pos = new Float32Array(N * 2 * 3)
    for (let i = 0; i < N; i++) {
      const x = (Math.random() - 0.5) * 14
      const y = Math.random() * 10
      const z = (Math.random() - 0.5) * 14
      pos[i * 6] = x
      pos[i * 6 + 1] = y
      pos[i * 6 + 2] = z
      pos[i * 6 + 3] = x
      pos[i * 6 + 4] = y - 0.35
      pos[i * 6 + 5] = z
    }
    return pos
  }, [N])

  useFrame((_, dt) => {
    if (!visible || !ref.current) return
    const d = 14 * Math.min(dt, 0.05)
    for (let i = 0; i < positions.length; i += 6) {
      positions[i + 1] -= d
      positions[i + 4] -= d
      if (positions[i + 1] < 0) {
        positions[i + 1] = 10
        positions[i + 4] = 10 - 0.35
      }
    }
    ;(ref.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate =
      true
  })

  return (
    <lineSegments ref={ref} visible={visible}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color={0xaecbe0} transparent opacity={0.5} />
    </lineSegments>
  )
}
