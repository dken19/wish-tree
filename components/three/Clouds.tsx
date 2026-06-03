'use client'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useIsMobile } from './useIsMobile'

const TAU = Math.PI * 2

// Mây trắng to lững lờ trôi trên trời (billboard sprite), nằm cao và xa -> trời rộng.
function cloudTexture(): THREE.CanvasTexture {
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  const blob = (x: number, y: number, r: number, a: number) => {
    const grd = g.createRadialGradient(x, y, 0, x, y, r)
    grd.addColorStop(0, `rgba(255,255,255,${a})`)
    grd.addColorStop(0.6, `rgba(255,255,255,${a * 0.5})`)
    grd.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grd
    g.beginPath()
    g.arc(x, y, r, 0, TAU)
    g.fill()
  }
  blob(128, 150, 72, 0.95)
  blob(84, 166, 52, 0.85)
  blob(172, 164, 56, 0.85)
  blob(108, 128, 46, 0.8)
  blob(152, 126, 44, 0.8)
  return new THREE.CanvasTexture(c)
}

export default function Clouds() {
  const isMobile = useIsMobile()
  const tex = useMemo(() => cloudTexture(), [])
  const driftRef = useRef<THREE.Group>(null)
  const mistRef = useRef<THREE.Group>(null)

  const N = isMobile ? 10 : 18
  const clouds = useMemo(() => {
    const arr: { pos: [number, number, number]; scale: number; speed: number }[] = []
    for (let i = 0; i < N; i++) {
      const a = Math.random() * TAU
      const r = 28 + Math.random() * 55
      arr.push({
        pos: [Math.cos(a) * r, 10 + Math.random() * 18, Math.sin(a) * r],
        scale: 10 + Math.random() * 14,
        speed: 0.25 + Math.random() * 0.4,
      })
    }
    return arr
  }, [N])

  // Sương MỜ vắt ngang sườn/chân các dãy núi xa -> chiều sâu, huyền ảo.
  const M = isMobile ? 14 : 28
  const mist = useMemo(() => {
    const arr: { pos: [number, number, number]; scale: number; speed: number }[] = []
    for (let i = 0; i < M; i++) {
      const a = Math.random() * TAU
      const r = 55 + Math.random() * 75
      arr.push({
        pos: [Math.cos(a) * r, -10 + Math.random() * 16, Math.sin(a) * r],
        scale: 22 + Math.random() * 26,
        speed: 0.12 + Math.random() * 0.18,
      })
    }
    return arr
  }, [M])

  const mat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        opacity: 0.92,
        fog: false,
      }),
    [tex]
  )
  // sương: dẹt, rất mờ, ám màu trời
  const mistMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        opacity: 0.35,
        color: 0xdde7ee,
        fog: false,
      }),
    [tex]
  )

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05)
    const grp = driftRef.current
    if (grp) {
      grp.children.forEach((ch, i) => {
        ch.position.x += d * clouds[i].speed
        if (ch.position.x > 90) ch.position.x = -90
      })
    }
    const mg = mistRef.current
    if (mg) {
      mg.children.forEach((ch, i) => {
        ch.position.x += d * mist[i].speed
        if (ch.position.x > 135) ch.position.x = -135
      })
    }
  })

  return (
    <group>
      <group ref={driftRef}>
        {clouds.map((s, i) => (
          <sprite key={i} position={s.pos} scale={[s.scale, s.scale * 0.55, 1]} material={mat} />
        ))}
      </group>
      <group ref={mistRef}>
        {mist.map((s, i) => (
          <sprite
            key={i}
            position={s.pos}
            scale={[s.scale, s.scale * 0.32, 1]}
            material={mistMat}
          />
        ))}
      </group>
    </group>
  )
}
