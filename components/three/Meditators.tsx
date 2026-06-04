'use client'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useScene } from '@/store/useScene'
import type { Session } from '@/lib/presence'

const TAU = Math.PI * 2
const CAP = 14 // tối đa số slime vẽ
const RING_R = 3.6

// bảng màu pastel cho slime (gel mềm)
const BODY_COLORS = [
  0x8fd39a, 0x86c7e0, 0xf2b6c6, 0xc9b3f0, 0xf0d28a, 0x9fe0c8, 0xe8a9d4, 0xa9d99b,
]

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`
}

function positionFor(i: number, n: number): [number, number, number] {
  const a = (i / Math.max(1, n)) * TAU
  return [Math.cos(a) * RING_R, 0, Math.sin(a) * RING_R]
}

// Nhãn tên + đồng hồ phiên = sprite texture canvas, vẽ lại 1 lần/giây (nhẹ mobile).
function Label({ session, self }: { session: Session; self: boolean }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 128
    const t = new THREE.CanvasTexture(c)
    t.minFilter = THREE.LinearFilter
    return t
  }, [])
  const lastSec = useRef(-1)

  const draw = (elapsed: number) => {
    const c = tex.image as HTMLCanvasElement
    const g = c.getContext('2d')!
    g.clearRect(0, 0, 256, 128)
    g.font = '600 30px "Be Vietnam Pro", sans-serif'
    g.textAlign = 'center'
    g.fillStyle = self ? '#ffe6a8' : '#f2efe8'
    g.fillText(session.name.slice(0, 18), 128, 40)
    g.font = '700 44px "Be Vietnam Pro", monospace'
    g.fillStyle = '#ffffff'
    g.fillText(fmt(elapsed), 128, 92)
    tex.needsUpdate = true
  }

  useFrame(() => {
    const elapsed = Date.now() - (session.joinedAt || Date.now())
    const sec = Math.floor(elapsed / 1000)
    if (sec !== lastSec.current) {
      lastSec.current = sec
      draw(elapsed)
    }
  })

  return (
    <sprite scale={[1.7, 0.85, 1]} renderOrder={2}>
      <spriteMaterial map={tex} transparent depthWrite={false} depthTest={false} />
    </sprite>
  )
}

// Một SLIME: thân tròn dẹt (gel), 2 mắt to + chấm sáng, CHỚP MẮT, nhún nhẹ,
// luôn quay mặt về camera. Tự phát sáng nhẹ -> dễ thương trong sương.
function Slime({
  session,
  x,
  z,
  bodyGeo,
  eyeGeo,
  pupilGeo,
}: {
  session: Session
  x: number
  z: number
  bodyGeo: THREE.SphereGeometry
  eyeGeo: THREE.SphereGeometry
  pupilGeo: THREE.SphereGeometry
}) {
  const grp = useRef<THREE.Group>(null)
  const eyes = useRef<THREE.Group>(null)
  const self = !!session.isSelf

  const color = useMemo(() => {
    if (self) return 0xffd98a
    return BODY_COLORS[hashStr(session.clientId) % BODY_COLORS.length]
  }, [session.clientId, self])

  const bodyMat = useMemo(() => {
    const c = new THREE.Color(color)
    return new THREE.MeshStandardMaterial({
      color: c,
      roughness: 0.38,
      metalness: 0,
      emissive: c.clone().multiplyScalar(0.18),
    })
  }, [color])
  const eyeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x2a2f2c, roughness: 0.3 }),
    []
  )
  const pupilMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0xffffff }),
    []
  )

  const phase = useMemo(
    () => ((hashStr(session.clientId) % 1000) / 1000) * TAU,
    [session.clientId]
  )
  const nextBlink = useRef(1 + Math.random() * 3)
  const blinkLeft = useRef(0)

  useFrame((state, dt) => {
    const g = grp.current
    if (!g) return
    const t = state.clock.elapsedTime
    // nhún + nhịp gel
    const bob = Math.sin(t * 1.6 + phase) * 0.05
    g.position.set(x, 0.4 + bob, z)
    // quay mặt về camera (chỉ yaw)
    g.rotation.y = Math.atan2(state.camera.position.x - x, state.camera.position.z - z)
    // chớp mắt
    if (blinkLeft.current <= 0 && t > nextBlink.current) {
      blinkLeft.current = 0.15
      nextBlink.current = t + 2.2 + Math.random() * 4
    }
    let open = 1
    if (blinkLeft.current > 0) {
      blinkLeft.current -= Math.min(dt, 0.05)
      const p = 1 - Math.max(0, blinkLeft.current) / 0.15 // 0..1
      open = 1 - Math.sin(p * Math.PI) * 0.92 // nháy xuống ~0.08 rồi mở lại
    }
    if (eyes.current) eyes.current.scale.y = open
  })

  return (
    <group ref={grp}>
      {/* thân gel dẹt */}
      <mesh geometry={bodyGeo} material={bodyMat} castShadow scale={[1.15, 0.82, 1.15]} />
      {/* mắt (chớp = co scale.y) */}
      <group ref={eyes} position={[0, 0.12, 0.3]}>
        <mesh geometry={eyeGeo} material={eyeMat} position={[-0.13, 0, 0.06]} />
        <mesh geometry={eyeGeo} material={eyeMat} position={[0.13, 0, 0.06]} />
        <mesh geometry={pupilGeo} material={pupilMat} position={[-0.1, 0.04, 0.11]} />
        <mesh geometry={pupilGeo} material={pupilMat} position={[0.16, 0.04, 0.11]} />
      </group>
    </group>
  )
}

export default function Meditators({ active }: { active: boolean }) {
  const sessions = useScene((s) => s.sessions)
  const bots = useScene((s) => s.bots)

  // gộp người thật + người ảo
  const all = useMemo(() => [...sessions, ...bots].slice(0, CAP), [sessions, bots])
  const n = all.length

  const bodyGeo = useMemo(() => new THREE.SphereGeometry(0.42, 16, 12), [])
  const eyeGeo = useMemo(() => new THREE.SphereGeometry(0.072, 10, 8), [])
  const pupilGeo = useMemo(() => new THREE.SphereGeometry(0.03, 8, 6), [])

  if (!active) return null

  return (
    <group>
      {all.map((s, i) => {
        const [x, , z] = positionFor(i, n)
        return (
          <group key={s.clientId}>
            <Slime
              session={s}
              x={x}
              z={z}
              bodyGeo={bodyGeo}
              eyeGeo={eyeGeo}
              pupilGeo={pupilGeo}
            />
            <group position={[x, 1.5, z]}>
              <Label session={s} self={!!s.isSelf} />
            </group>
          </group>
        )
      })}
    </group>
  )
}
