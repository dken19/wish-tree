'use client'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import Bamboo from './Bamboo'
import Meditators from './Meditators'

const TAU = Math.PI * 2

// Camera phòng: tự xoay chậm quanh vòng người thiền (tĩnh tâm, mượt mobile).
function RoomCamera({ active }: { active: boolean }) {
  const camera = useThree((s) => s.camera)
  const theta = useRef(0.5)
  useFrame((_, dt) => {
    if (!active) return
    theta.current += Math.min(dt, 0.05) * 0.05
    const r = 6.5 // ngồi TRONG vòng trúc (trúc ở r8+) -> trúc thành phông nền
    camera.position.set(Math.sin(theta.current) * r, 2.4, Math.cos(theta.current) * r)
    camera.lookAt(0, 1, 0)
  })
  return null
}

// Nền SỎI TRẮNG tròn (zen): nhiều viên sỏi bo tròn, sáng, có tiếp xúc tối nhẹ.
function gravelTexture(): THREE.CanvasTexture {
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = '#c9ccc4'
  g.fillRect(0, 0, S, S)
  // hàm tất định nhẹ (không Math.random để tránh nhảy giữa các lần) — dùng sin hash
  let seed = 1
  const rnd = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  for (let i = 0; i < 900; i++) {
    const x = rnd() * S
    const y = rnd() * S
    const r = 3 + rnd() * 6
    // bóng tiếp xúc dưới viên
    g.fillStyle = 'rgba(120,124,116,0.35)'
    g.beginPath()
    g.ellipse(x, y + r * 0.5, r, r * 0.55, 0, 0, TAU)
    g.fill()
    // viên sỏi sáng bo tròn
    const grd = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r)
    grd.addColorStop(0, '#fbfbf7')
    grd.addColorStop(0.7, '#e7e9e2')
    grd.addColorStop(1, '#c2c6bd')
    g.fillStyle = grd
    g.beginPath()
    g.arc(x, y, r, 0, TAU)
    g.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.RepeatWrapping
  t.repeat.set(6, 6)
  return t
}

// Vài viên sỏi 3D nổi để bắt nắng + đổ bóng thật.
function Pebbles() {
  const geo = useMemo(() => new THREE.SphereGeometry(1, 10, 8), [])
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0xeef0ea, roughness: 0.95 }),
    []
  )
  const data = useMemo(() => {
    const arr: { x: number; z: number; s: number }[] = []
    let seed = 7
    const rnd = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    for (let i = 0; i < 22; i++) {
      const a = rnd() * TAU
      const r = 1.2 + rnd() * 8
      arr.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, s: 0.18 + rnd() * 0.28 })
    }
    return arr
  }, [])
  const ref = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return
    const dummy = new THREE.Object3D()
    data.forEach((p, i) => {
      dummy.position.set(p.x, p.s * 0.45, p.z)
      dummy.scale.set(p.s, p.s * 0.62, p.s) // dẹt như sỏi
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }
  return <instancedMesh ref={ref} args={[geo, mat, data.length]} castShadow receiveShadow />
}

// Tia nắng xuyên ngọn trúc: vài cột sáng additive nhạt rọi xuống.
function shaftTexture(): THREE.CanvasTexture {
  const W = 32
  const H = 128
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const grd = g.createLinearGradient(0, 0, 0, H)
  grd.addColorStop(0, 'rgba(255,246,210,0.55)') // đỉnh (ngọn cây) sáng
  grd.addColorStop(0.5, 'rgba(255,243,200,0.18)')
  grd.addColorStop(1, 'rgba(255,240,190,0)') // tới đất thì tắt
  g.fillStyle = grd
  g.fillRect(0, 0, W, H)
  return new THREE.CanvasTexture(c)
}

function Shafts() {
  const tex = useMemo(() => shaftTexture(), [])
  const geo = useMemo(() => {
    // cột thuôn: rộng dưới, hẹp trên (apex ở trên = khe ngọn cây)
    const g = new THREE.ConeGeometry(1.5, 11, 5, 1, true)
    g.translate(0, 5.5, 0)
    return g
  }, [])
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        opacity: 0.32, // dịu lại, đỡ loá
      }),
    [tex]
  )
  const shafts = useMemo(
    () => [
      { x: -2.2, z: -1.5, rot: 0.18 },
      { x: 1.8, z: 0.8, rot: -0.14 },
      { x: -0.6, z: 2.4, rot: 0.1 },
      { x: 3.2, z: -2.6, rot: -0.2 },
      { x: 0.4, z: -3.0, rot: 0.16 },
    ],
    []
  )
  const grp = useRef<THREE.Group>(null)
  useFrame((state) => {
    const g = grp.current
    if (!g) return
    g.children.forEach((ch, i) => {
      const m = (ch as THREE.Mesh).material as THREE.MeshBasicMaterial
      m.opacity = 0.2 + 0.14 * (0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 0.5 + i))
    })
  })
  return (
    <group ref={grp}>
      {shafts.map((s, i) => (
        <mesh key={i} geometry={geo} material={mat.clone()} position={[s.x, 0, s.z]} rotation-z={s.rot} />
      ))}
    </group>
  )
}

function mistTexture(): THREE.CanvasTexture {
  const S = 128
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  grd.addColorStop(0, 'rgba(235,242,228,0.45)')
  grd.addColorStop(1, 'rgba(235,242,228,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, S, S)
  return new THREE.CanvasTexture(c)
}

// Phòng Rừng Trúc: nền sỏi trắng + trúc theo cụm + người thiền + nắng xuyên ngọn.
export default function FocusRoom({ active }: { active: boolean }) {
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const mistTex = useMemo(() => mistTexture(), [])
  const gravelTex = useMemo(() => gravelTexture(), [])

  // override fog xanh dịu khi vào phòng; khôi phục fog cũ khi rời.
  // đồng thời GHÌM phơi sáng xuống khi trời nắng (exposure cao) -> phòng đỡ chói/loá.
  useEffect(() => {
    if (!active) return
    const savedFog = scene.fog
    const savedExp = gl.toneMappingExposure
    scene.fog = new THREE.Fog(0xaec6a0, 9, 34)
    gl.toneMappingExposure = Math.min(savedExp, 0.9)
    return () => {
      scene.fog = savedFog
      gl.toneMappingExposure = savedExp
    }
  }, [active, scene, gl])

  const mistPos = useMemo(() => {
    const arr = new Float32Array(10 * 3)
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2
      const r = 6 + (i % 3) * 2.5
      arr[i * 3] = Math.cos(a) * r
      arr[i * 3 + 1] = 0.8 + (i % 2) * 0.5
      arr[i * 3 + 2] = Math.sin(a) * r
    }
    return arr
  }, [])

  if (!active) return null

  return (
    <group>
      <RoomCamera active={active} />
      {/* đèn fill dịu (bóng thật do mặt trời của SceneEnv tạo) */}
      <ambientLight intensity={0.3} color={0xe6f0d8} />
      <directionalLight position={[5, 9, 3]} intensity={0.32} color={0xfff2d6} />

      {/* nền SỎI (hơi ngà thay vì trắng tinh -> đỡ phản sáng chói) */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[28, 48]} />
        <meshStandardMaterial map={gravelTex} roughness={1} color={0xe8e2d4} />
      </mesh>
      <Pebbles />

      <Bamboo />
      <Meditators active={active} />
      <Shafts />

      {/* sương lửng quanh gốc trúc */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[mistPos, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={mistTex}
          size={5}
          sizeAttenuation
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </points>
    </group>
  )
}
