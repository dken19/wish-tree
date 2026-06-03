'use client'
import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { pointer } from '@/lib/runtime'
import { useScene } from '@/store/useScene'
import { peakCenter } from '@/lib/peaks'

// Hào quang mềm (giống CalligraphyDesk) — vừa mời bấm vừa là vùng chạm ổn định
// ở khoảng cách xa (sizeAttenuation=false -> không teo theo cự ly).
function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, 'rgba(255,236,170,.95)')
  grd.addColorStop(0.45, 'rgba(255,205,120,.42)')
  grd.addColorStop(1, 'rgba(255,205,120,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

// Mái chùa kiểu phương Đông: nón 4 cạnh thấp, hơi loe.
function Roof({ y, r, h }: { y: number; r: number; h: number }) {
  return (
    <mesh position-y={y} rotation-y={Math.PI / 4}>
      <coneGeometry args={[r, h, 4]} />
      <meshStandardMaterial color={0xb5532f} roughness={0.85} />
    </mesh>
  )
}

// Thiền viện nhỏ low-poly trên một đỉnh núi xa. Bấm -> mở phòng Rừng Trúc.
export default function Monastery() {
  const setRoomOpen = useScene((s) => s.setRoomOpen)
  const glowRef = useRef<THREE.Sprite>(null)
  const glowTex = useMemo(() => glowTexture(), [])

  // Đặt trên đỉnh nón ở trước tầm nhìn mặc định (vành trong, ngọn i=2).
  const peak = useMemo(() => peakCenter(0, 2), [])
  const wall = 0xe8dcc4
  const stone = 0x9b9384

  useFrame((state) => {
    const sp = glowRef.current
    if (!sp) return
    const t = state.clock.elapsedTime
    const k = 0.5 + 0.5 * Math.sin(t * 1.6)
    ;(sp.material as THREE.SpriteMaterial).opacity = 0.5 + 0.4 * k
    const s = 0.11 + 0.025 * k
    sp.scale.set(s, s, 1)
  })

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (pointer.moved > 7) return
    e.stopPropagation()
    setRoomOpen(true)
  }
  const hover = (v: boolean) => {
    if (typeof document !== 'undefined')
      document.body.style.cursor = v ? 'pointer' : 'default'
  }

  return (
    <group
      position={[peak.x, peak.apexY - 1.6, peak.z]}
      onClick={onClick}
      onPointerOver={() => hover(true)}
      onPointerOut={() => hover(false)}
    >
      {/* bệ đá rộng để toà nhà không cắm vào chóp nhọn */}
      <mesh position-y={0.4}>
        <cylinderGeometry args={[3.4, 4.2, 0.8, 6]} />
        <meshStandardMaterial color={stone} roughness={1} />
      </mesh>

      {/* tầng dưới + mái */}
      <mesh position-y={2.0}>
        <boxGeometry args={[4.6, 2.4, 4.6]} />
        <meshStandardMaterial color={wall} roughness={0.9} />
      </mesh>
      <Roof y={3.9} r={4.4} h={1.7} />

      {/* tầng trên + mái */}
      <mesh position-y={5.3}>
        <boxGeometry args={[3.2, 1.8, 3.2]} />
        <meshStandardMaterial color={wall} roughness={0.9} />
      </mesh>
      <Roof y={6.9} r={3.2} h={1.5} />

      {/* tầng đỉnh + mái + chóp */}
      <mesh position-y={8.1}>
        <boxGeometry args={[1.9, 1.3, 1.9]} />
        <meshStandardMaterial color={wall} roughness={0.9} />
      </mesh>
      <Roof y={9.4} r={2.1} h={1.3} />
      <mesh position-y={10.6}>
        <coneGeometry args={[0.28, 1.0, 8]} />
        <meshStandardMaterial color={0xcaa45a} roughness={0.5} metalness={0.3} />
      </mesh>

      {/* hào quang + vùng chạm (kích thước ổn định trên màn dù ở xa) */}
      <sprite ref={glowRef} position-y={12.4} scale={[0.11, 0.11, 1]} onClick={onClick}>
        <spriteMaterial
          map={glowTex}
          transparent
          depthWrite={false}
          depthTest={false}
          sizeAttenuation={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  )
}
