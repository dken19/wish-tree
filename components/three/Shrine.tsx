'use client'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useScene } from '@/store/useScene'
import { SHRINE_FACE, SHRINE_POS } from '@/lib/roomMap'
import { walkTo } from '@/lib/runtime'

const TAU = Math.PI * 2

// Vị trí bàn thờ: lib/roomMap (dùng chung với va chạm). Bấm tượng -> nhân vật tự đi tới chỗ vái rồi mở bảng.
export { SHRINE_POS }
const FACE = SHRINE_FACE

function labelTexture(text: string, sub: string): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 128
  const g = c.getContext('2d')!
  g.textAlign = 'center'
  g.shadowColor = 'rgba(10, 20, 14, 0.8)'
  g.shadowBlur = 10
  g.fillStyle = '#ffe6a8'
  g.font = '700 46px "Be Vietnam Pro", sans-serif'
  g.fillText(text, 256, 56)
  g.fillStyle = '#f2efe8'
  g.font = '500 30px "Be Vietnam Pro", sans-serif'
  g.fillText(sub, 256, 104)
  const t = new THREE.CanvasTexture(c)
  t.minFilter = THREE.LinearFilter
  return t
}

function softDot(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.4, 'rgba(255,255,255,0.5)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

// Tượng đá đứng chắp tay (dáng chung, không mô phỏng vị thần cụ thể) trên bệ sen.
function Statue({ stone }: { stone: THREE.Material }) {
  const robe = useMemo(() => {
    const pts = [
      [0.3, 0],
      [0.31, 0.12],
      [0.27, 0.45],
      [0.23, 0.75],
      [0.2, 0.95],
      [0.13, 1.05],
      [0.06, 1.08],
    ].map(([x, y]) => new THREE.Vector2(x, y))
    return new THREE.LatheGeometry(pts, 20)
  }, [])
  return (
    <group position={[0, 0.7, 0]}>
      {/* bệ sen: vòng cánh dẹt */}
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * TAU
        return (
          <mesh key={i} material={stone} position={[Math.cos(a) * 0.3, 0.02, Math.sin(a) * 0.3]} rotation-y={-a} scale={[0.14, 0.07, 0.09]}>
            <sphereGeometry args={[1, 10, 8]} />
          </mesh>
        )
      })}
      <mesh geometry={robe} material={stone} position={[0, 0.05, 0]} castShadow />
      {/* vai + tay áo khép trước ngực */}
      <mesh material={stone} position={[0, 0.98, 0]} scale={[1, 0.55, 0.8]}>
        <sphereGeometry args={[0.24, 16, 12]} />
      </mesh>
      <mesh material={stone} position={[0, 0.82, 0.17]} scale={[1, 1, 0.7]} castShadow>
        <capsuleGeometry args={[0.09, 0.12, 4, 10]} />
      </mesh>
      {/* bàn tay chắp */}
      <mesh material={stone} position={[0, 0.97, 0.24]} rotation-x={-0.2} scale={[0.55, 1, 0.5]}>
        <capsuleGeometry args={[0.06, 0.1, 4, 8]} />
      </mesh>
      {/* đầu + búi tóc + vầng hào quang đá */}
      <mesh material={stone} position={[0, 1.24, 0]} castShadow>
        <sphereGeometry args={[0.15, 18, 14]} />
      </mesh>
      <mesh material={stone} position={[0, 1.4, -0.02]}>
        <sphereGeometry args={[0.065, 12, 10]} />
      </mesh>
      <mesh material={stone} position={[0, 1.26, -0.12]}>
        <torusGeometry args={[0.24, 0.025, 8, 32]} />
      </mesh>
    </group>
  )
}

export default function Shrine() {
  const shrineOpen = useScene((s) => s.shrineOpen)

  const stone = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x9c9a8e, roughness: 0.95, metalness: 0 }),
    []
  )
  const darkStone = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x7d7b70, roughness: 0.98 }),
    []
  )
  const bronze = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x8a6a2e, roughness: 0.45, metalness: 0.7 }),
    []
  )
  const lampGlow = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0xffd38a, toneMapped: false }),
    []
  )
  const label = useMemo(() => labelTexture('Vái 3 lần', 'nhận một lời chúc'), [])
  const dot = useMemo(() => softDot(), [])

  // ---- khói hương (14 hạt bay lên, mạnh hơn ngay sau mỗi lần vái) ----
  const SMOKE = 14
  const smoke = useMemo(() => {
    const pos = new Float32Array(SMOKE * 3)
    const life = new Float32Array(SMOKE)
    for (let i = 0; i < SMOKE; i++) life[i] = i / SMOKE
    return { pos, life }
  }, [])
  const smokeGeo = useRef<THREE.BufferGeometry>(null)
  const smokeMat = useRef<THREE.PointsMaterial>(null)
  const puff = useRef(0)

  // ---- chùm sáng chúc phúc (bung ra khi vái đủ 3 lần) ----
  const BURST = 48
  const burst = useMemo(() => {
    const pos = new Float32Array(BURST * 3)
    const vel = new Float32Array(BURST * 3)
    return { pos, vel }
  }, [])
  const burstGeo = useRef<THREE.BufferGeometry>(null)
  const burstMat = useRef<THREE.PointsMaterial>(null)
  const burstT = useRef(-1)
  const halo = useRef<THREE.Mesh>(null)

  // phản ứng: mỗi lần vái -> phụt khói; vừa được chúc phúc -> bung sáng
  useEffect(
    () =>
      useScene.subscribe((s, prev) => {
        if (s.bowNonce !== prev.bowNonce) puff.current = 1
        if (s.blessedUntil > prev.blessedUntil && s.blessedUntil > Date.now() + 50 * 60_000) {
          burstT.current = 0
          for (let i = 0; i < BURST; i++) {
            const a = Math.random() * TAU
            const up = 0.6 + Math.random() * 1.6
            const sp = 0.6 + Math.random() * 1.2
            burst.pos.set([0, 1.9, 0], i * 3)
            burst.vel.set([Math.cos(a) * sp, up, Math.sin(a) * sp], i * 3)
          }
        }
      }),
    [burst]
  )

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05)
    // khói
    puff.current = Math.max(0, puff.current - d * 0.45)
    const speed = 0.25 + puff.current * 0.9
    for (let i = 0; i < SMOKE; i++) {
      smoke.life[i] += d * speed * 0.5
      if (smoke.life[i] > 1) smoke.life[i] -= 1
      const l = smoke.life[i]
      const sway = Math.sin(l * 6 + i) * 0.06 * l
      smoke.pos.set([sway + (i % 3 - 1) * 0.03, 0.88 + l * (1.2 + puff.current * 0.8), 0.95 + Math.cos(l * 5 + i) * 0.04], i * 3)
    }
    if (smokeGeo.current) smokeGeo.current.attributes.position.needsUpdate = true
    if (smokeMat.current) smokeMat.current.opacity = 0.18 + puff.current * 0.35
    // bung sáng
    if (burstT.current >= 0) {
      burstT.current += d
      const t = burstT.current
      for (let i = 0; i < BURST; i++) {
        burst.vel[i * 3 + 1] -= d * 0.6
        burst.pos[i * 3] += burst.vel[i * 3] * d
        burst.pos[i * 3 + 1] += burst.vel[i * 3 + 1] * d
        burst.pos[i * 3 + 2] += burst.vel[i * 3 + 2] * d
      }
      if (burstGeo.current) burstGeo.current.attributes.position.needsUpdate = true
      if (burstMat.current) burstMat.current.opacity = Math.max(0, 1 - t / 2.6)
      if (t > 2.6) burstT.current = -1
    }
    if (halo.current) {
      const m = halo.current.material as THREE.MeshBasicMaterial
      const glow = burstT.current >= 0 ? Math.max(0, 1 - burstT.current / 2.6) : 0
      m.opacity = 0.12 + glow * 0.6 + puff.current * 0.12
    }
  })

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!useScene.getState().roomOpen) return // phòng đang ẩn
    e.stopPropagation()
    walkTo('shrine')
  }

  return (
    <group
      position={SHRINE_POS}
      rotation-y={FACE}
      onClick={onClick}
      onPointerOver={() => useScene.getState().roomOpen && (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      {/* bệ đá bát giác 2 tầng */}
      <mesh material={darkStone} position={[0, 0.12, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.95, 1.05, 0.24, 8]} />
      </mesh>
      <mesh material={stone} position={[0, 0.45, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.55, 0.62, 0.42, 8]} />
      </mesh>
      <Statue stone={stone} />

      {/* hào quang sau tượng (sáng lên khi vái / được chúc) */}
      <mesh ref={halo} position={[0, 1.95, -0.25]}>
        <circleGeometry args={[0.7, 32]} />
        <meshBasicMaterial map={dot} color={0xffd38a} transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>

      {/* bàn hương + lư hương đồng + 3 nén nhang */}
      <mesh material={darkStone} position={[0, 0.36, 0.95]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.12, 0.42]} />
      </mesh>
      <mesh material={darkStone} position={[-0.32, 0.15, 0.95]}>
        <boxGeometry args={[0.12, 0.3, 0.3]} />
      </mesh>
      <mesh material={darkStone} position={[0.32, 0.15, 0.95]}>
        <boxGeometry args={[0.12, 0.3, 0.3]} />
      </mesh>
      <mesh material={bronze} position={[0, 0.49, 0.95]} castShadow>
        <cylinderGeometry args={[0.11, 0.09, 0.14, 16]} />
      </mesh>
      {[-0.035, 0, 0.035].map((x, i) => (
        <group key={i} position={[x, 0.56, 0.95]} rotation-z={x * 3}>
          <mesh position={[0, 0.14, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.28, 5]} />
            <meshStandardMaterial color={0xa8332b} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.285, 0]} material={lampGlow}>
            <sphereGeometry args={[0.012, 6, 5]} />
          </mesh>
        </group>
      ))}

      {/* 2 đèn đá hai bên */}
      {[-1.25, 1.25].map((x) => (
        <group key={x} position={[x, 0, 0.5]}>
          <mesh material={darkStone} position={[0, 0.06, 0]} castShadow>
            <boxGeometry args={[0.36, 0.12, 0.36]} />
          </mesh>
          <mesh material={stone} position={[0, 0.42, 0]} castShadow>
            <boxGeometry args={[0.13, 0.62, 0.13]} />
          </mesh>
          <mesh material={stone} position={[0, 0.86, 0]}>
            <boxGeometry args={[0.3, 0.26, 0.3]} />
          </mesh>
          <mesh material={lampGlow} position={[0, 0.86, 0.151]}>
            <planeGeometry args={[0.14, 0.14]} />
          </mesh>
          <mesh material={darkStone} position={[0, 1.06, 0]} rotation-y={Math.PI / 4}>
            <coneGeometry args={[0.3, 0.18, 4]} />
          </mesh>
          <sprite position={[0, 0.86, 0.2]} scale={[0.7, 0.7, 1]}>
            <spriteMaterial map={dot} color={0xffc977} transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </sprite>
        </group>
      ))}

      {/* khói hương */}
      <points>
        <bufferGeometry ref={smokeGeo}>
          <bufferAttribute attach="attributes-position" args={[smoke.pos, 3]} />
        </bufferGeometry>
        <pointsMaterial ref={smokeMat} map={dot} color={0xe9e4dc} size={0.35} sizeAttenuation transparent opacity={0.2} depthWrite={false} />
      </points>

      {/* chùm sáng chúc phúc */}
      <points>
        <bufferGeometry ref={burstGeo}>
          <bufferAttribute attach="attributes-position" args={[burst.pos, 3]} />
        </bufferGeometry>
        <pointsMaterial ref={burstMat} map={dot} color={0xffd170} size={0.22} sizeAttenuation transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </points>

      {/* nhãn mời vái (ẩn khi đang ở bàn thờ) */}
      {!shrineOpen && (
        <sprite position={[0, 2.75, 0]} scale={[1.9, 0.48, 1]} renderOrder={3}>
          <spriteMaterial map={label} transparent depthWrite={false} depthTest={false} />
        </sprite>
      )}

      {/* vùng bấm rộng, vô hình (dễ chạm trên điện thoại) */}
      <mesh position={[0, 1.2, 0.3]}>
        <boxGeometry args={[2.8, 2.6, 2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  )
}
