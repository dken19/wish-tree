'use client'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useScene } from '@/store/useScene'
import type { Session } from '@/lib/presence'
import { player } from '@/lib/runtime'
import { useIsMobile } from './useIsMobile'

const TAU = Math.PI * 2
const CAP = 14 // tối đa số người vẽ (desktop)
const CAP_MOBILE = 9
const LABEL_FAR = 11 // xa hơn thì ẩn nhãn + ngừng vẽ lại canvas
const RING_R = 3.6

// Bảng màu người chibi (chọn tất định theo clientId)
const SKIN = [0xf6d2b8, 0xeec1a0, 0xdcab86]
const HAIR = [0x2b211c, 0x4a3426, 0x1d1d22, 0x6e4528, 0x3b2a3f]
const SHIRT = [0x8fc7a0, 0x86b7e0, 0xf2b6c6, 0xc9b3f0, 0xf0d28a, 0x9fd8c8, 0xf4a98a, 0xa9c4e8]
const PANTS = [0x4a5872, 0x6b5848, 0x55606b, 0x7a6a8c]
const CUSHION = [0x8c3b34, 0x6b5a3e, 0x3e5a52]
const SELF_SHIRT = 0xf2b555 // mình = áo vàng đèn lồng

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
  // đông người thì vòng ghế nới ra (≤ 4,8 m, vẫn trong sân) để nhãn tên không đè nhau
  const r = RING_R + Math.max(0, n - 8) * 0.2
  return [Math.cos(a) * r, 0, Math.sin(a) * r]
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
  const sprite = useRef<THREE.Sprite>(null)
  const wp = useMemo(() => new THREE.Vector3(), [])

  const draw = (elapsed: number) => {
    const c = tex.image as HTMLCanvasElement
    const g = c.getContext('2d')!
    g.clearRect(0, 0, 256, 128)
    g.font = '600 30px "Be Vietnam Pro", sans-serif'
    g.textAlign = 'center'
    // bóng chữ: đọc được trên nền sỏi/sương sáng
    g.shadowColor = 'rgba(10, 20, 14, 0.75)'
    g.shadowBlur = 8
    g.fillStyle = self ? '#ffe6a8' : '#f2efe8'
    g.fillText(session.name.slice(0, 18), 128, 40)
    g.font = '700 44px "Be Vietnam Pro", monospace'
    g.fillStyle = '#ffffff'
    g.fillText(fmt(elapsed), 128, 92)
    tex.needsUpdate = true
  }

  useFrame(({ camera }) => {
    // Nhãn gần camera không được phình to che màn hình: thu nhỏ theo khoảng cách (≤ 6 đơn vị)
    if (sprite.current) {
      sprite.current.getWorldPosition(wp)
      const dist = camera.position.distanceTo(wp)
      const far = !self && dist > LABEL_FAR
      sprite.current.visible = !far
      if (far) return // xa: không vẽ, không cập nhật texture
      const k = Math.min(1, dist / 6)
      sprite.current.scale.set(1.7 * k, 0.85 * k, 1)
    }
    const elapsed = Date.now() - (session.joinedAt || Date.now())
    const sec = Math.floor(elapsed / 1000)
    if (sec !== lastSec.current) {
      lastSec.current = sec
      draw(elapsed)
    }
  })

  return (
    <sprite ref={sprite} scale={[1.7, 0.85, 1]} renderOrder={2}>
      <spriteMaterial map={tex} transparent depthWrite={false} depthTest={false} />
    </sprite>
  )
}

// ---------- Người chibi ngồi thiền trên bồ đoàn ----------
// Mỗi người = 1 geometry GỘP (vertex color) dựng 1 lần lúc mount + 1 mesh mắt (để chớp).
// -> 2 draw call / người, nhẹ cho mobile. Mặt hướng +Z, gốc toạ độ ở mặt đất.
const HEAD_Y = 0.88
const HEAD_R = 0.29

function part(
  g: THREE.BufferGeometry,
  color: number,
  pos: [number, number, number],
  opts: { scale?: [number, number, number]; quat?: THREE.Quaternion; rotX?: number; rotZ?: number } = {}
): THREE.BufferGeometry {
  const m = new THREE.Matrix4()
  const q = opts.quat ?? new THREE.Quaternion().setFromEuler(new THREE.Euler(opts.rotX ?? 0, 0, opts.rotZ ?? 0))
  m.compose(new THREE.Vector3(...pos), q, new THREE.Vector3(...(opts.scale ?? [1, 1, 1])))
  g.applyMatrix4(m)
  const c = new THREE.Color(color) // setHex sRGB -> linear (đúng cho vertex color)
  const n = g.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r
    arr[i * 3 + 1] = c.g
    arr[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  return g
}

/** Chi (tay) nối 2 điểm: capsule xoay theo hướng a->b. */
function limb(r: number, a: THREE.Vector3, b: THREE.Vector3, color: number) {
  const dir = b.clone().sub(a)
  const len = dir.length()
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
  const mid = a.clone().add(b).multiplyScalar(0.5)
  return part(new THREE.CapsuleGeometry(r, Math.max(0.01, len - r * 2), 4, 10), color, [mid.x, mid.y, mid.z], { quat: q })
}

type Palette = { skin: number; hair: number; shirt: number; pants: number; cushion: number; style: number }

function palette(seed: number, self: boolean): Palette {
  // trộn bit (murmur3 fmix) theo từng thuộc tính -> id gần giống nhau vẫn ra người khác nhau
  const mix = (k: number) => {
    let h = (seed ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b)
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
    return (h ^ (h >>> 16)) >>> 0
  }
  const pick = <T,>(arr: T[], k: number) => arr[mix(k) % arr.length]
  return {
    skin: pick(SKIN, 1),
    hair: pick(HAIR, 3),
    shirt: self ? SELF_SHIRT : pick(SHIRT, 5),
    pants: pick(PANTS, 8),
    cushion: pick(CUSHION, 10),
    style: mix(12) % 4, // 0 tóc ngắn, 1 búi, 2 hai búi, 3 tóc dài
  }
}

/** Đầu chibi + mặt + tóc, tâm đầu ở độ cao headY. */
function headParts(p: Palette, headY: number): THREE.BufferGeometry[] {
  const H = (x: number, y: number, z: number): [number, number, number] => [x, headY + y, z]
  const parts = [
    part(new THREE.SphereGeometry(HEAD_R, 24, 18), p.skin, H(0, 0, 0)),
    // má hồng + miệng cười
    part(new THREE.SphereGeometry(0.05, 10, 8), 0xf4a3a0, H(-0.165, -0.06, 0.215), { scale: [1, 0.6, 0.45] }),
    part(new THREE.SphereGeometry(0.05, 10, 8), 0xf4a3a0, H(0.165, -0.06, 0.215), { scale: [1, 0.6, 0.45] }),
    part(new THREE.TorusGeometry(0.04, 0.011, 6, 12, Math.PI), 0x5b3a32, H(0, -0.085, 0.272), { rotZ: Math.PI, rotX: -0.25 }),
    // tóc: mái phủ đỉnh + phần sau/hai bên chừa mặt
    part(new THREE.SphereGeometry(HEAD_R * 1.05, 22, 10, 0, TAU, 0, Math.PI * 0.34), p.hair, H(0, 0, 0)),
    part(new THREE.SphereGeometry(HEAD_R * 1.07, 22, 12, Math.PI / 2 + 0.95, TAU - 1.9, 0, Math.PI * 0.62), p.hair, H(0, 0, -0.005)),
  ]
  if (p.style === 1) parts.push(part(new THREE.SphereGeometry(0.11, 12, 10), p.hair, H(0, 0.28, -0.1)))
  if (p.style === 2) {
    parts.push(part(new THREE.SphereGeometry(0.09, 12, 10), p.hair, H(-0.22, 0.2, -0.04)))
    parts.push(part(new THREE.SphereGeometry(0.09, 12, 10), p.hair, H(0.22, 0.2, -0.04)))
  }
  if (p.style === 3) parts.push(part(new THREE.CapsuleGeometry(0.2, 0.28, 4, 12), p.hair, H(0, -0.2, -0.12), { scale: [1, 1, 0.55] }))
  return parts
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts.map((g) => g.toNonIndexed()), false)!
  parts.forEach((g) => g.dispose())
  merged.computeBoundingSphere()
  return merged
}

/** Dáng NGỒI THIỀN trên bồ đoàn (cushion=false: bồ đoàn vẽ riêng ở ghế, dùng cho nhân vật của mình). */
function buildPerson(seed: number, self: boolean, cushion = true): THREE.BufferGeometry {
  const p = palette(seed, self)
  const parts: THREE.BufferGeometry[] = [
    // chân xếp bằng + 2 đầu gối
    part(new THREE.CapsuleGeometry(0.13, 0.46, 4, 10), p.pants, [0, 0.24, 0.1], { rotZ: Math.PI / 2 }),
    part(new THREE.SphereGeometry(0.15, 12, 10), p.pants, [-0.3, 0.23, 0.14]),
    part(new THREE.SphereGeometry(0.15, 12, 10), p.pants, [0.3, 0.23, 0.14]),
    // thân
    part(new THREE.CapsuleGeometry(0.21, 0.2, 4, 14), p.shirt, [0, 0.5, 0], { scale: [1, 1, 0.82] }),
    // tay -> 2 bàn tay đặt trên lòng (ấn thiền)
    limb(0.065, new THREE.Vector3(-0.24, 0.64, 0), new THREE.Vector3(-0.1, 0.34, 0.22), p.shirt),
    limb(0.065, new THREE.Vector3(0.24, 0.64, 0), new THREE.Vector3(0.1, 0.34, 0.22), p.shirt),
    part(new THREE.SphereGeometry(0.075, 10, 8), p.skin, [-0.07, 0.33, 0.24]),
    part(new THREE.SphereGeometry(0.075, 10, 8), p.skin, [0.07, 0.33, 0.24]),
    ...headParts(p, HEAD_Y),
  ]
  if (cushion) parts.unshift(part(new THREE.CylinderGeometry(0.42, 0.47, 0.14, 20), p.cushion, [0, 0.07, 0]))
  return merge(parts)
}

// Dáng ĐỨNG (nhân vật của mình khi đi lại): thân+đầu gộp; chân/tay riêng để đánh nhịp khi đi.
const STAND_HEAD_Y = 1.13
const HIP_Y = 0.42
const SHOULDER_Y = 0.8

function buildStanding(seed: number) {
  const p = palette(seed, true)
  const body = merge([
    part(new THREE.CapsuleGeometry(0.2, 0.22, 4, 14), p.shirt, [0, 0.66, 0], { scale: [1, 1, 0.8] }),
    part(new THREE.CylinderGeometry(0.17, 0.2, 0.12, 14), p.pants, [0, HIP_Y + 0.04, 0]),
    ...headParts(p, STAND_HEAD_Y),
  ])
  // chân: trục quay ở hông (gốc 0), duỗi xuống -Y; bàn chân nhô ra trước
  const leg = merge([
    part(new THREE.CapsuleGeometry(0.075, 0.26, 4, 10), p.pants, [0, -0.2, 0]),
    part(new THREE.SphereGeometry(0.085, 10, 8), 0x3a2f2a, [0, -0.39, 0.035], { scale: [1, 0.6, 1.35] }),
  ])
  // tay: trục ở vai, duỗi xuống -Y, bàn tay ở cuối
  const arm = merge([
    part(new THREE.CapsuleGeometry(0.06, 0.2, 4, 10), p.shirt, [0, -0.15, 0]),
    part(new THREE.SphereGeometry(0.07, 10, 8), p.skin, [0, -0.32, 0]),
  ])
  const cushion = merge([part(new THREE.CylinderGeometry(0.42, 0.47, 0.14, 20), p.cushion, [0, 0.07, 0])])
  return { body, leg, arm, cushion }
}

// Hào quang "được chúc phúc": hạt vàng xoay quanh người (chỉ avatar của mình, khi còn buff).
function Aura() {
  const N = 26
  const blessedUntil = useScene((s) => s.blessedUntil)
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 32
    const g = c.getContext('2d')!
    const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16)
    grd.addColorStop(0, 'rgba(255,255,255,1)')
    grd.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grd
    g.fillRect(0, 0, 32, 32)
    return new THREE.CanvasTexture(c)
  }, [])
  const pos = useMemo(() => new Float32Array(N * 3), [])
  const geo = useRef<THREE.BufferGeometry>(null)
  const pts = useRef<THREE.Points>(null)
  useFrame((state) => {
    const on = blessedUntil > Date.now()
    if (pts.current) pts.current.visible = on
    if (!on) return
    const t = state.clock.elapsedTime
    for (let i = 0; i < N; i++) {
      const k = i / N
      const a = k * TAU * 3 + t * 0.8
      const y = ((k + t * 0.12) % 1) * 1.5 + 0.1
      const r = 0.52 + Math.sin(t * 2 + i) * 0.05
      pos.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3)
    }
    if (geo.current) geo.current.attributes.position.needsUpdate = true
  })
  return (
    <points ref={pts} visible={false}>
      <bufferGeometry ref={geo}>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
      </bufferGeometry>
      <pointsMaterial map={tex} color={0xffd170} size={0.13} sizeAttenuation transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  )
}

function Person({
  session,
  x,
  z,
  mat,
  eyeGeo,
  eyeMat,
}: {
  session: Session
  x: number
  z: number
  mat: THREE.Material
  eyeGeo: THREE.BufferGeometry
  eyeMat: THREE.Material
}) {
  const grp = useRef<THREE.Group>(null)
  const eyes = useRef<THREE.Mesh>(null)
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const self = !!session.isSelf
  const seed = useMemo(() => hashStr(session.clientId), [session.clientId])
  const geo = useMemo(() => buildPerson(seed, self), [seed, self])
  useEffect(() => () => geo.dispose(), [geo])

  const phase = useMemo(() => ((seed % 1000) / 1000) * TAU, [seed])
  const nextBlink = useRef(1 + (seed % 300) / 100)
  const blinkLeft = useRef(0)

  useFrame((state, dt) => {
    const g = grp.current
    if (!g) return
    const t = state.clock.elapsedTime
    // thở chậm (phồng nhẹ) + lắc lư rất khẽ
    const breath = Math.sin(t * 0.9 + phase)
    // đổi chỗ (người vào/ra) -> trượt mượt về ghế mới, không nhảy cóc
    if (g.position.lengthSq() === 0) g.position.set(x, 0, z)
    else g.position.lerp(tmp.set(x, 0, z), Math.min(1, dt * 3))
    const gx = g.position.x
    const gz = g.position.z
    g.scale.set(1, 1 + breath * 0.012, 1)
    // quay mặt về camera (chỉ yaw) + nghiêng nhẹ
    g.rotation.set(0, Math.atan2(state.camera.position.x - gx, state.camera.position.z - gz), Math.sin(t * 0.5 + phase) * 0.025)
    // chớp mắt
    if (blinkLeft.current <= 0 && t > nextBlink.current) {
      blinkLeft.current = 0.15
      nextBlink.current = t + 2.5 + ((seed + Math.floor(t)) % 40) / 10
    }
    let open = 1
    if (blinkLeft.current > 0) {
      blinkLeft.current -= Math.min(dt, 0.05)
      const p = 1 - Math.max(0, blinkLeft.current) / 0.15
      open = 1 - Math.sin(p * Math.PI) * 0.9
    }
    if (eyes.current) eyes.current.scale.y = open
  })

  return (
    <group ref={grp}>
      <mesh geometry={geo} material={mat} castShadow />
      <mesh ref={eyes} geometry={eyeGeo} material={eyeMat} position={[0, HEAD_Y + 0.005, 0.262]} />
      {self && <Aura />}
      {/* nhãn trong group (đi theo khi trượt), bù xoay/scale không đáng kể */}
      <group position-y={1.65}>
        <Label session={session} self={self} />
      </group>
    </group>
  )
}

// Nhân vật CỦA MÌNH: đi lại được (PlayerController cập nhật `player`), đứng yên tại ghế thì ngồi thiền.
function PlayerAvatar({
  session,
  seatX,
  seatZ,
  mat,
  eyeGeo,
  eyeMat,
}: {
  session: Session
  seatX: number
  seatZ: number
  mat: THREE.Material
  eyeGeo: THREE.BufferGeometry
  eyeMat: THREE.Material
}) {
  const seed = useMemo(() => hashStr(session.clientId), [session.clientId])
  const seated = useMemo(() => buildPerson(seed, true, false), [seed])
  const stand = useMemo(() => buildStanding(seed), [seed])
  useEffect(
    () => () => {
      seated.dispose()
      Object.values(stand).forEach((g) => g.dispose())
    },
    [seated, stand]
  )

  // ghế của mình; lần đầu vào phòng thì đặt nhân vật ngồi sẵn ở ghế
  useEffect(() => {
    player.seatX = seatX
    player.seatZ = seatZ
    if (!player.ready) {
      player.x = seatX
      player.z = seatZ
      player.yaw = Math.atan2(-seatX, -seatZ)
      player.sit = 1
      player.ready = true
    }
  }, [seatX, seatZ])

  const root = useRef<THREE.Group>(null)
  const sitG = useRef<THREE.Group>(null)
  const standG = useRef<THREE.Group>(null)
  const upper = useRef<THREE.Group>(null)
  const legL = useRef<THREE.Mesh>(null)
  const legR = useRef<THREE.Mesh>(null)
  const armL = useRef<THREE.Mesh>(null)
  const armR = useRef<THREE.Mesh>(null)
  const eyesSit = useRef<THREE.Mesh>(null)
  const eyesStand = useRef<THREE.Mesh>(null)
  const label = useRef<THREE.Group>(null)
  const walk = useRef(0)
  const bowSeen = useRef(-1)
  const bowAt = useRef(-10)
  const nextBlink = useRef(2)
  const blinkLeft = useRef(0)

  useFrame((state, dt) => {
    const g = root.current
    if (!g) return
    const t = state.clock.elapsedTime
    g.position.set(player.x, 0, player.z)
    g.rotation.y = player.yaw
    const sitting = player.sit > 0.5
    if (sitG.current) sitG.current.visible = sitting
    if (standG.current) standG.current.visible = !sitting
    // nhịp bước
    const m = player.moving ? 1 : 0
    walk.current += dt * 9 * m
    const sw = Math.sin(walk.current) * 0.65 * m
    if (legL.current) legL.current.rotation.x = sw
    if (legR.current) legR.current.rotation.x = -sw
    if (armL.current) armL.current.rotation.x = -sw * 0.8
    if (armR.current) armR.current.rotation.x = sw * 0.8
    if (standG.current) standG.current.position.y = Math.abs(Math.sin(walk.current)) * 0.05 * m + (m ? 0 : Math.sin(t * 1.4) * 0.008)
    if (sitG.current) sitG.current.scale.y = 1 + Math.sin(t * 0.9) * 0.012
    // vái: gập người từ hông theo mỗi bowNonce (khớp nhịp camera 1s)
    const sc = useScene.getState()
    if (bowSeen.current < 0) bowSeen.current = sc.bowNonce
    if (sc.bowNonce !== bowSeen.current) {
      bowSeen.current = sc.bowNonce
      bowAt.current = t
    }
    const bp = (t - bowAt.current) / 1.0
    const bowK = bp >= 0 && bp < 1 ? Math.sin(bp * Math.PI) : 0
    if (upper.current) upper.current.rotation.x = bowK * 0.6
    if (armL.current && bowK > 0) armL.current.rotation.x = -1.1 * bowK
    if (armR.current && bowK > 0) armR.current.rotation.x = -1.1 * bowK
    if (label.current) {
      label.current.position.y = sitting ? 1.65 : 1.85
      label.current.visible = !sc.shrineOpen
    }
    // chớp mắt
    if (blinkLeft.current <= 0 && t > nextBlink.current) {
      blinkLeft.current = 0.15
      nextBlink.current = t + 2.5 + (seed % 30) / 10
    }
    let open = 1
    if (blinkLeft.current > 0) {
      blinkLeft.current -= Math.min(dt, 0.05)
      open = 1 - Math.sin((1 - Math.max(0, blinkLeft.current) / 0.15) * Math.PI) * 0.9
    }
    if (eyesSit.current) eyesSit.current.scale.y = open
    if (eyesStand.current) eyesStand.current.scale.y = open
  })

  return (
    <>
      {/* bồ đoàn ở yên tại ghế */}
      <mesh geometry={stand.cushion} material={mat} position={[seatX, 0, seatZ]} receiveShadow />
      <group ref={root}>
        <group ref={sitG}>
          <mesh geometry={seated} material={mat} position={[0, 0.12, 0]} castShadow />
          <mesh ref={eyesSit} geometry={eyeGeo} material={eyeMat} position={[0, HEAD_Y + 0.125, 0.262]} />
        </group>
        <group ref={standG} visible={false}>
          <mesh ref={legL} geometry={stand.leg} material={mat} position={[-0.1, HIP_Y, 0]} castShadow />
          <mesh ref={legR} geometry={stand.leg} material={mat} position={[0.1, HIP_Y, 0]} castShadow />
          {/* thân trên: trục ở hông để cúi vái */}
          <group ref={upper} position-y={HIP_Y}>
            <mesh geometry={stand.body} material={mat} position-y={-HIP_Y} castShadow />
            <mesh ref={eyesStand} geometry={eyeGeo} material={eyeMat} position={[0, STAND_HEAD_Y + 0.005 - HIP_Y, 0.262]} />
            <mesh ref={armL} geometry={stand.arm} material={mat} position={[-0.25, SHOULDER_Y - HIP_Y, 0]} rotation-z={-0.12} />
            <mesh ref={armR} geometry={stand.arm} material={mat} position={[0.25, SHOULDER_Y - HIP_Y, 0]} rotation-z={0.12} />
          </group>
        </group>
        <Aura />
        <group ref={label} position={[0, 1.65, 0]}>
          <Label session={session} self />
        </group>
      </group>
    </>
  )
}

export default function Meditators({ active }: { active: boolean }) {
  const sessions = useScene((s) => s.sessions)
  const bots = useScene((s) => s.bots)

  const isMobile = useIsMobile()
  // gộp người thật + người ảo; MÌNH luôn ở đầu (không bị cắt khi phòng đông, ghế mình không đổi)
  const all = useMemo(() => {
    const me = sessions.filter((s) => s.isSelf)
    const rest = sessions.filter((s) => !s.isSelf)
    return [...me, ...rest, ...bots].slice(0, isMobile ? CAP_MOBILE : CAP)
  }, [sessions, bots, isMobile])
  const n = all.length

  // người khác đang ngồi = vật cản cho nhân vật của mình
  useEffect(() => {
    player.others = all
      .map((s, i) => ({ s, p: positionFor(i, n) }))
      .filter(({ s }) => !s.isSelf)
      .map(({ p }) => ({ x: p[0], z: p[2], r: 0.5 }))
  }, [all, n])

  // dùng chung: 1 material vertex-color cho thân, 1 geometry + material cho đôi mắt
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0, side: THREE.DoubleSide }),
    []
  )
  const eyeGeo = useMemo(() => {
    const l = new THREE.SphereGeometry(0.04, 10, 8)
    l.scale(1, 1.35, 0.6)
    l.translate(-0.1, 0, 0)
    const r = new THREE.SphereGeometry(0.04, 10, 8)
    r.scale(1, 1.35, 0.6)
    r.translate(0.1, 0, 0)
    return mergeGeometries([l, r], false)!
  }, [])
  const eyeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x2a2320, roughness: 0.25 }), [])

  if (!active) return null

  return (
    <group>
      {all.map((s, i) => {
        const [x, , z] = positionFor(i, n)
        if (s.isSelf)
          return <PlayerAvatar key={s.clientId} session={s} seatX={x} seatZ={z} mat={mat} eyeGeo={eyeGeo} eyeMat={eyeMat} />
        return <Person key={s.clientId} session={s} x={x} z={z} mat={mat} eyeGeo={eyeGeo} eyeMat={eyeMat} />
      })}
    </group>
  )
}
