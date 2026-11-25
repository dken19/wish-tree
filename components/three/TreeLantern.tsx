'use client'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useCondition } from '@/store/useScene'
import type { Condition } from '@/lib/weather'
import { groundHeight } from '@/lib/terrain'

// Đèn ĐÁ đứng (kiểu sân chùa: bệ, trụ, hộp đèn giấy dó, mái cong) cạnh gốc cây ước. Là NGUỒN SÁNG THỨ 2 (pointLight ấm,
// không đổ bóng cho nhẹ) -> đêm/mưa vẫn thấy rõ gốc cây, cỏ, bàn thư pháp mà trời vẫn ra đêm.
const X = -2.3
const Z = 2.5

// độ sáng đèn theo thời tiết (ngày nắng chỉ hắt nhẹ)
const POWER: Record<Condition, number> = { clear: 0.7, cloud: 2.2, rain: 3.2, night: 9 }

function glowTexture(): THREE.CanvasTexture {
  const S = 128
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  grd.addColorStop(0, 'rgba(255,214,150,0.95)')
  grd.addColorStop(0.35, 'rgba(255,170,90,0.35)')
  grd.addColorStop(1, 'rgba(255,150,70,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, S, S)
  return new THREE.CanvasTexture(c)
}

export default function TreeLantern() {
  const cond = useCondition()
  const power = POWER[cond]
  const night = cond === 'night'
  const y0 = useMemo(() => groundHeight(X, Z), [])
  const glow = useMemo(() => glowTexture(), [])
  const light = useRef<THREE.PointLight>(null)
  const glowRef = useRef<THREE.Sprite>(null)
  const yaw = Math.atan2(-X, -Z) // mặt cửa sổ quay về gốc cây

  useFrame((state) => {
    const t = state.clock.elapsedTime
    // lửa nến lập loè rất nhẹ
    const flick = 1 + Math.sin(t * 7.1) * 0.03 + Math.sin(t * 12.7) * 0.02
    if (light.current) light.current.intensity = power * flick
    if (glowRef.current) {
      const s = (night ? 1.5 : 1.0) * flick
      glowRef.current.scale.set(s, s, 1)
    }
  })

  const stone = { color: 0xb9b3a6, roughness: 0.95 }
  const dark = { color: 0x8f897c, roughness: 0.95 }
  const CH = 0.86 // tâm hộp đèn

  return (
    <group position={[X, y0, Z]} rotation-y={yaw} scale={1.3}>
      {/* bệ 2 tầng */}
      <mesh position-y={0.07} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.34, 0.14, 8]} />
        <meshStandardMaterial {...dark} />
      </mesh>
      <mesh position-y={0.19} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.26, 0.1, 8]} />
        <meshStandardMaterial {...stone} />
      </mesh>
      {/* trụ */}
      <mesh position-y={0.45} castShadow>
        <cylinderGeometry args={[0.09, 0.11, 0.42, 8]} />
        <meshStandardMaterial {...stone} />
      </mesh>
      {/* đế hộp đèn */}
      <mesh position-y={0.69} castShadow>
        <boxGeometry args={[0.42, 0.08, 0.42]} />
        <meshStandardMaterial {...dark} />
      </mesh>
      {/* hộp đèn: 4 cột góc + giấy dó sáng bên trong */}
      {[
        [-0.15, -0.15],
        [0.15, -0.15],
        [-0.15, 0.15],
        [0.15, 0.15],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, CH, z]} castShadow>
          <boxGeometry args={[0.06, 0.26, 0.06]} />
          <meshStandardMaterial {...stone} />
        </mesh>
      ))}
      <mesh position-y={CH}>
        <boxGeometry args={[0.26, 0.24, 0.26]} />
        <meshStandardMaterial
          color={0xffe3b0}
          emissive={0xffa24a}
          emissiveIntensity={night ? 1.8 : 0.8}
          roughness={0.8}
          toneMapped={false}
        />
      </mesh>
      {/* mái cong 2 lớp + búp đỉnh */}
      <mesh position-y={1.03} castShadow>
        <cylinderGeometry args={[0.12, 0.36, 0.1, 4]} />
        <meshStandardMaterial {...dark} />
      </mesh>
      <mesh position-y={1.03} rotation-y={Math.PI / 4} castShadow>
        <cylinderGeometry args={[0.1, 0.3, 0.06, 4]} />
        <meshStandardMaterial {...stone} />
      </mesh>
      <mesh position-y={1.12}>
        <cylinderGeometry args={[0.05, 0.1, 0.08, 8]} />
        <meshStandardMaterial {...stone} />
      </mesh>
      <mesh position-y={1.2}>
        <sphereGeometry args={[0.055, 10, 8]} />
        <meshStandardMaterial {...stone} />
      </mesh>

      <group position-y={CH}>
        <sprite ref={glowRef} renderOrder={3}>
          <spriteMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
        <pointLight ref={light} color={0xffa860} intensity={power} distance={10} decay={1.5} />
      </group>
    </group>
  )
}
