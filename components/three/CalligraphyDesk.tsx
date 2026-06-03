'use client'
import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { pointer } from '@/lib/runtime'
import { groundHeight } from '@/lib/terrain'
import { useScene } from '@/store/useScene'

function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, 'rgba(255,236,170,.9)')
  grd.addColorStop(0.45, 'rgba(255,205,120,.4)')
  grd.addColorStop(1, 'rgba(255,205,120,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

// Bàn thư pháp low-poly: click vào -> mở khung viết điều ước.
export default function CalligraphyDesk() {
  const setComposerOpen = useScene((s) => s.setComposerOpen)
  const glowRef = useRef<THREE.Sprite>(null)
  const glowTex = useMemo(() => glowTexture(), [])

  const wood = 0x4a3122
  const woodTop = 0x5e3d29
  const paper = 0xf3ead6

  useFrame((state) => {
    const sp = glowRef.current
    if (!sp) return
    const t = state.clock.elapsedTime
    const k = 0.5 + 0.5 * Math.sin(t * 2)
    ;(sp.material as THREE.SpriteMaterial).opacity = 0.45 + 0.4 * k
    const s = 0.9 + 0.2 * k
    sp.scale.set(s, s, 1)
  })

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (pointer.moved > 7) return
    e.stopPropagation()
    setComposerOpen(true)
  }
  const hover = (v: boolean) => {
    if (typeof document !== 'undefined')
      document.body.style.cursor = v ? 'pointer' : 'default'
  }

  return (
    <group
      position={[2.4, groundHeight(2.4, 1.7), 1.7]}
      rotation-y={-0.7}
      onClick={onClick}
      onPointerOver={() => hover(true)}
      onPointerOut={() => hover(false)}
    >
      {/* mặt bàn */}
      <mesh position-y={0.52}>
        <boxGeometry args={[1.5, 0.08, 0.78]} />
        <meshLambertMaterial color={woodTop} />
      </mesh>
      {/* viền/khung dưới mặt */}
      <mesh position-y={0.45}>
        <boxGeometry args={[1.42, 0.09, 0.7]} />
        <meshLambertMaterial color={wood} />
      </mesh>
      {/* 4 chân */}
      {[
        [-0.66, -0.32],
        [0.66, -0.32],
        [-0.66, 0.32],
        [0.66, 0.32],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.22, z]}>
          <boxGeometry args={[0.08, 0.46, 0.08]} />
          <meshLambertMaterial color={wood} />
        </mesh>
      ))}
      {/* thanh ngang nối chân */}
      <mesh position={[0, 0.14, 0]}>
        <boxGeometry args={[1.3, 0.05, 0.05]} />
        <meshLambertMaterial color={wood} />
      </mesh>

      {/* tờ giấy trên bàn */}
      <mesh position={[0.05, 0.565, 0.02]} rotation-x={-Math.PI / 2} rotation-z={0.04}>
        <planeGeometry args={[0.66, 0.48]} />
        <meshLambertMaterial
          color={paper}
          side={THREE.DoubleSide}
          emissive={0x7a6a4a}
          emissiveIntensity={0.18}
        />
      </mesh>
      {/* vài nét mực gợi ý trên giấy */}
      <mesh position={[0.05, 0.567, 0.02]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.16, 0.32]} />
        <meshBasicMaterial color={0x2a2018} transparent opacity={0.35} />
      </mesh>

      {/* nghiên mực */}
      <mesh position={[-0.5, 0.575, -0.18]}>
        <cylinderGeometry args={[0.1, 0.11, 0.04, 16]} />
        <meshLambertMaterial color={0x241f1b} />
      </mesh>
      <mesh position={[-0.5, 0.595, -0.18]}>
        <cylinderGeometry args={[0.07, 0.07, 0.012, 16]} />
        <meshBasicMaterial color={0x0c0a08} />
      </mesh>

      {/* gác bút + bút lông */}
      <mesh position={[0.5, 0.59, -0.16]}>
        <boxGeometry args={[0.16, 0.04, 0.05]} />
        <meshLambertMaterial color={wood} />
      </mesh>
      <group position={[0.32, 0.61, -0.05]} rotation-z={0.5} rotation-y={-0.3}>
        <mesh>
          <cylinderGeometry args={[0.012, 0.012, 0.42, 8]} />
          <meshLambertMaterial color={0x8a5a3a} />
        </mesh>
        <mesh position-y={-0.24}>
          <coneGeometry args={[0.022, 0.1, 8]} />
          <meshLambertMaterial color={0x1a1410} />
        </mesh>
        {/* dây treo bút */}
        <mesh position-y={0.23}>
          <sphereGeometry args={[0.016, 8, 8]} />
          <meshBasicMaterial color={0xc0241f} />
        </mesh>
      </group>

      {/* triện đỏ */}
      <mesh position={[0.46, 0.585, 0.22]}>
        <boxGeometry args={[0.07, 0.05, 0.07]} />
        <meshLambertMaterial color={0xc0241f} />
      </mesh>

      {/* hào quang mời click */}
      <sprite ref={glowRef} position={[0.05, 0.95, 0.02]} scale={[1, 1, 1]}>
        <spriteMaterial
          map={glowTex}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  )
}
