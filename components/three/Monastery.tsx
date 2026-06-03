'use client'
import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { pointer } from '@/lib/runtime'
import { useScene } from '@/store/useScene'
import { peakCenter } from '@/lib/peaks'

const TAU = Math.PI * 2

function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, 'rgba(255,238,180,.95)')
  grd.addColorStop(0.45, 'rgba(255,205,120,.4)')
  grd.addColorStop(1, 'rgba(255,205,120,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

// Màu sắc đền
const WALL = 0xe9ddc6
const TRIM = 0x9a2f24 // gỗ son đỏ
const ROOF = 0x6f3326 // ngói nâu sẫm
const ROOF_EDGE = 0xcaa45a // diềm mái mạ vàng
const STONE = 0x9a958a
const GOLD = 0xcaa45a

// Mái đền có DIỀM CONG (đầu đao hếch lên 4 góc) — đặc trưng đền Việt/Á Đông.
function TempleRoof({ y, r, h }: { y: number; r: number; h: number }) {
  const horns = useMemo(() => [0, 1, 2, 3].map((i) => (i / 4) * TAU + Math.PI / 4), [])
  return (
    <group position-y={y}>
      {/* mái nón 4 cạnh */}
      <mesh rotation-y={Math.PI / 4} castShadow>
        <coneGeometry args={[r, h, 4]} />
        <meshStandardMaterial color={ROOF} roughness={0.8} />
      </mesh>
      {/* diềm mái vàng (vành dưới) */}
      <mesh position-y={-h * 0.36} rotation-y={Math.PI / 4}>
        <coneGeometry args={[r * 1.04, h * 0.28, 4]} />
        <meshStandardMaterial color={ROOF_EDGE} roughness={0.5} metalness={0.3} />
      </mesh>
      {/* 4 đầu đao hếch lên ở góc mái */}
      {horns.map((a, i) => (
        <mesh
          key={i}
          position={[Math.cos(a) * r * 0.74, -h * 0.32, Math.sin(a) * r * 0.74]}
          rotation={[0, -a, 0.7]}
        >
          <coneGeometry args={[0.14 * r, 0.7 * r, 4]} />
          <meshStandardMaterial color={ROOF_EDGE} roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

// Cụm đèn lồng phát sáng (nhấp nháy) hai bên cửa.
function Lantern({ x, z, glowRef }: { x: number; z: number; glowRef: (m: THREE.Mesh | null) => void }) {
  return (
    <mesh ref={glowRef} position={[x, 4.3, z]}>
      <sphereGeometry args={[0.34, 12, 10]} />
      <meshStandardMaterial color={0xff5a3c} emissive={0xff5a2a} emissiveIntensity={1.6} roughness={0.6} />
    </mesh>
  )
}

// Ngôi đền/thiền viện cầu kỳ trên đỉnh núi xa. Bấm -> phòng Rừng Trúc.
export default function Monastery() {
  const setRoomOpen = useScene((s) => s.setRoomOpen)
  const haloRef = useRef<THREE.Sprite>(null)
  const beamRef = useRef<THREE.Mesh>(null)
  const lanternL = useRef<THREE.Mesh>(null)
  const lanternR = useRef<THREE.Mesh>(null)
  const doorRef = useRef<THREE.MeshStandardMaterial>(null)
  const moteRef = useRef<THREE.Points>(null)
  const glowTex = useMemo(() => glowTexture(), [])

  const peak = useMemo(() => peakCenter(0, 2), [])
  // quay đền hướng về tâm thung lũng (cửa nhìn ra ngoài)
  const faceYaw = useMemo(() => Math.atan2(-peak.x, -peak.z), [peak])

  // hạt sáng lơ lửng quanh đền
  const motePos = useMemo(() => {
    const N = 14
    const arr = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU
      const r = 3 + (i % 3)
      arr[i * 3] = Math.cos(a) * r
      arr[i * 3 + 1] = 2 + (i % 5)
      arr[i * 3 + 2] = Math.sin(a) * r
    }
    return arr
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const k = 0.5 + 0.5 * Math.sin(t * 1.6)
    const halo = haloRef.current
    if (halo) {
      ;(halo.material as THREE.SpriteMaterial).opacity = 0.55 + 0.4 * k
      const s = 0.17 + 0.04 * k
      halo.scale.set(s, s, 1)
    }
    if (beamRef.current) {
      const m = beamRef.current.material as THREE.MeshBasicMaterial
      m.opacity = 0.18 + 0.22 * k
    }
    const le = 1.2 + 1.2 * (0.5 + 0.5 * Math.sin(t * 2.2))
    if (lanternL.current) (lanternL.current.material as THREE.MeshStandardMaterial).emissiveIntensity = le
    if (lanternR.current) (lanternR.current.material as THREE.MeshStandardMaterial).emissiveIntensity = le
    if (doorRef.current) doorRef.current.emissiveIntensity = 0.9 + 0.5 * k
    if (moteRef.current) moteRef.current.rotation.y = t * 0.12
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
      position={[peak.x, peak.apexY - 1.4, peak.z]}
      rotation-y={faceYaw}
      onClick={onClick}
      onPointerOver={() => hover(true)}
      onPointerOut={() => hover(false)}
    >
      {/* ----- bệ đá + bậc thang ----- */}
      <mesh position-y={0.4} castShadow receiveShadow>
        <cylinderGeometry args={[5, 5.6, 0.8, 8]} />
        <meshStandardMaterial color={STONE} roughness={1} />
      </mesh>
      <mesh position-y={1.0} castShadow>
        <boxGeometry args={[8, 0.5, 6]} />
        <meshStandardMaterial color={STONE} roughness={1} />
      </mesh>
      {/* bậc thang trước cửa */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.6 + i * 0.18, 3 + i * 0.4]} castShadow>
          <boxGeometry args={[3.2, 0.18, 0.5]} />
          <meshStandardMaterial color={STONE} roughness={1} />
        </mesh>
      ))}

      {/* ----- gian chính ----- */}
      <mesh position-y={2.6} castShadow receiveShadow>
        <boxGeometry args={[6.6, 2.8, 4.8]} />
        <meshStandardMaterial color={WALL} roughness={0.9} />
      </mesh>
      {/* dầm đỏ trên/dưới tường */}
      <mesh position-y={3.9}>
        <boxGeometry args={[6.9, 0.35, 5.1]} />
        <meshStandardMaterial color={TRIM} roughness={0.7} />
      </mesh>
      <mesh position-y={1.4}>
        <boxGeometry args={[6.9, 0.3, 5.1]} />
        <meshStandardMaterial color={TRIM} roughness={0.7} />
      </mesh>
      {/* hàng cột son đỏ phía trước */}
      {[-2.5, -1.25, 1.25, 2.5].map((x, i) => (
        <mesh key={i} position={[x, 2.6, 2.5]} castShadow>
          <cylinderGeometry args={[0.16, 0.18, 2.8, 8]} />
          <meshStandardMaterial color={TRIM} roughness={0.7} />
        </mesh>
      ))}
      {/* CỬA phát sáng (mời bước vào) */}
      <mesh position={[0, 2.3, 2.42]}>
        <planeGeometry args={[1.5, 2.4]} />
        <meshStandardMaterial
          ref={doorRef}
          color={0xffce7a}
          emissive={0xffb24a}
          emissiveIntensity={1.0}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* hai cửa sổ phát sáng */}
      {[-2.2, 2.2].map((x, i) => (
        <mesh key={i} position={[x, 2.7, 2.42]}>
          <planeGeometry args={[0.7, 0.9]} />
          <meshStandardMaterial color={0xffd98c} emissive={0xffbe55} emissiveIntensity={0.8} />
        </mesh>
      ))}

      {/* ----- mái tầng 1 ----- */}
      <TempleRoof y={5.0} r={5.0} h={2.0} />

      {/* ----- tầng 2 ----- */}
      <mesh position-y={6.2} castShadow>
        <boxGeometry args={[4.4, 1.8, 3.2]} />
        <meshStandardMaterial color={WALL} roughness={0.9} />
      </mesh>
      <mesh position-y={6.2} rotation-y={Math.PI / 4}>
        <boxGeometry args={[0.9, 1.5, 0.9]} />
        <meshStandardMaterial color={0xffd98c} emissive={0xffbe55} emissiveIntensity={0.6} />
      </mesh>
      <TempleRoof y={7.9} r={3.6} h={1.7} />

      {/* ----- tầng đỉnh + chóp ----- */}
      <mesh position-y={9.0} castShadow>
        <boxGeometry args={[2.6, 1.4, 2.0]} />
        <meshStandardMaterial color={WALL} roughness={0.9} />
      </mesh>
      <TempleRoof y={10.3} r={2.4} h={1.5} />
      <mesh position-y={11.4}>
        <cylinderGeometry args={[0.12, 0.18, 0.9, 8]} />
        <meshStandardMaterial color={GOLD} roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh position-y={12.0}>
        <sphereGeometry args={[0.26, 12, 10]} />
        <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.5} roughness={0.4} metalness={0.5} />
      </mesh>

      {/* ----- đèn lồng phát sáng hai bên cửa ----- */}
      <Lantern x={-2.7} z={2.7} glowRef={(m) => (lanternL.current = m)} />
      <Lantern x={2.7} z={2.7} glowRef={(m) => (lanternR.current = m)} />

      {/* ----- CỘT SÁNG mời bấm (additive, nhấp nháy) ----- */}
      <mesh ref={beamRef} position-y={9}>
        <cylinderGeometry args={[0.5, 1.4, 18, 12, 1, true]} />
        <meshBasicMaterial
          color={0xffe6a8}
          transparent
          opacity={0.25}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* hạt sáng lơ lửng */}
      <points ref={moteRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[motePos, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={glowTex}
          size={1.1}
          sizeAttenuation
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          color={0xffe6b0}
        />
      </points>

      {/* hào quang + vùng chạm ổn định ở xa (sizeAttenuation off) */}
      <sprite ref={haloRef} position-y={14} scale={[0.17, 0.17, 1]} onClick={onClick}>
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
