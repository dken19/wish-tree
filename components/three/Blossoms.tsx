'use client'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TIPS } from '@/lib/tree'
import { windRef } from '@/lib/runtime'
import { useIsMobile } from './useIsMobile'

const PALETTE: [number, number, number][] = [
  [1.0, 0.84, 0.88], // hồng phấn
  [1.0, 0.7, 0.78], // hồng
  [1.0, 0.56, 0.67], // hồng đậm
  [1.0, 0.92, 0.95], // hồng rất nhạt
  [1.0, 1.0, 1.0], // trắng
]

// Vẽ một bông hoa 5 cánh mềm lên canvas -> dùng làm texture cho point sprite.
function makeFlowerTexture(): THREE.CanvasTexture {
  const S = 128
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  g.translate(S / 2, S / 2)
  // 5 cánh
  for (let i = 0; i < 5; i++) {
    g.save()
    g.rotate((i / 5) * Math.PI * 2)
    const grd = g.createRadialGradient(0, -30, 4, 0, -30, 26)
    grd.addColorStop(0, 'rgba(255,255,255,0.95)')
    grd.addColorStop(0.5, 'rgba(255,228,235,0.9)')
    grd.addColorStop(1, 'rgba(255,210,224,0)')
    g.fillStyle = grd
    g.beginPath()
    g.ellipse(0, -30, 16, 24, 0, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }
  // nhụy
  const center = g.createRadialGradient(0, 0, 0, 0, 0, 12)
  center.addColorStop(0, 'rgba(255,221,120,0.95)')
  center.addColorStop(1, 'rgba(255,221,120,0)')
  g.fillStyle = center
  g.beginPath()
  g.arc(0, 0, 12, 0, Math.PI * 2)
  g.fill()
  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  return tex
}

// Hoa trang trí quanh tán (point sprites mềm, billboard luôn hướng camera).
export default function Blossoms() {
  const isMobile = useIsMobile()
  const N = isMobile ? 90 : 160
  const ref = useRef<THREE.Points>(null)
  const tex = useMemo(() => makeFlowerTexture(), [])

  const { positions, colors, sway } = useMemo(() => {
    const pos = new Float32Array(N * 3)
    const col = new Float32Array(N * 3)
    const sw = new Float32Array(N * 2) // [biên độ, pha]
    for (let i = 0; i < N; i++) {
      const t = TIPS[i % TIPS.length]
      pos[i * 3] = t[0] + (Math.random() - 0.5) * 1.3
      pos[i * 3 + 1] = t[1] + (Math.random() - 0.2) * 0.9 - 0.1
      pos[i * 3 + 2] = t[2] + (Math.random() - 0.5) * 1.3
      const p = PALETTE[(Math.random() * PALETTE.length) | 0]
      col[i * 3] = p[0]
      col[i * 3 + 1] = p[1]
      col[i * 3 + 2] = p[2]
      sw[i * 2] = 0.02 + Math.random() * 0.04
      sw[i * 2 + 1] = Math.random() * Math.PI * 2
    }
    return { positions: pos, colors: col, sway: sw }
  }, [N])

  // Lưu vị trí gốc để dao động nhẹ theo gió
  const base = useMemo(() => positions.slice(), [positions])

  useFrame((state) => {
    const pts = ref.current
    if (!pts) return
    const t = state.clock.elapsedTime
    const wind = windRef.current
    const attr = pts.geometry.attributes.position as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    for (let i = 0; i < N; i++) {
      const amp = sway[i * 2] * wind
      const phase = sway[i * 2 + 1]
      arr[i * 3] = base[i * 3] + Math.sin(t * 1.1 + phase) * amp
      arr[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.9 + phase) * amp
    }
    attr.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={tex}
        size={isMobile ? 0.5 : 0.6}
        sizeAttenuation
        vertexColors
        transparent
        depthWrite={false}
        alphaTest={0.01}
      />
    </points>
  )
}
