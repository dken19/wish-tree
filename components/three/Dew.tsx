'use client'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useIsMobile } from './useIsMobile'

// Texture đốm sáng mềm cho giọt sương
function dewTex(): THREE.CanvasTexture {
  const S = 64
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.35, 'rgba(220,240,255,0.7)')
  grd.addColorStop(1, 'rgba(200,230,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, S, S)
  return new THREE.CanvasTexture(c)
}

// Giọt sương lấp lánh trôi nhẹ quanh cây/cỏ.
export default function Dew() {
  const isMobile = useIsMobile()
  const N = isMobile ? 22 : 55
  const ref = useRef<THREE.Points>(null)
  const matRef = useRef<THREE.PointsMaterial>(null)
  const tex = useMemo(() => dewTex(), [])

  const { positions, drift } = useMemo(() => {
    const pos = new Float32Array(N * 3)
    const dr: { speed: number; sx: number; phase: number; y0: number }[] = []
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2
      const r = 0.8 + Math.random() * 7
      pos[i * 3] = Math.cos(a) * r
      pos[i * 3 + 1] = 0.2 + Math.random() * 3.2
      pos[i * 3 + 2] = Math.sin(a) * r
      dr.push({
        speed: 0.12 + Math.random() * 0.22,
        sx: Math.random() * 6,
        phase: Math.random() * Math.PI * 2,
        y0: pos[i * 3 + 1],
      })
    }
    return { positions: pos, drift: dr }
  }, [N])

  useFrame((state, dt) => {
    const pts = ref.current
    if (!pts) return
    const t = state.clock.elapsedTime
    const d = Math.min(dt, 0.05)
    const attr = pts.geometry.attributes.position as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    for (let i = 0; i < N; i++) {
      const dd = drift[i]
      arr[i * 3 + 1] += dd.speed * d // trôi lên nhẹ
      arr[i * 3] += Math.sin(t * 0.8 + dd.sx) * d * 0.08 // lượn ngang
      if (arr[i * 3 + 1] > 4.2) arr[i * 3 + 1] = 0.15 // tái sinh ở dưới
    }
    attr.needsUpdate = true
    // lấp lánh: độ mờ nhấp nháy
    if (matRef.current) {
      matRef.current.opacity = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 3))
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        map={tex}
        color={0xffffff}
        size={isMobile ? 0.14 : 0.16}
        sizeAttenuation
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
