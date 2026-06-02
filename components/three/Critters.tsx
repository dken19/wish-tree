'use client'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useIsMobile } from './useIsMobile'

type Kind = 'butterfly' | 'dragonfly'
type Spec = {
  kind: Kind
  radius: number
  height: number
  speed: number
  phase: number
  bob: number
  flap: number
  color: number
}

const BFLY_COLORS = [0xe8743a, 0x5a86d6, 0xf2c84a, 0xe06aa0, 0xef9d3b, 0x7d5fc0]

// ----- Texture cánh bướm (gồm cánh trên + cánh dưới), thân ở mép TRÁI (u=0) -----
function butterflyWingTex(): THREE.CanvasTexture {
  const W = 128
  const c = document.createElement('canvas')
  c.width = c.height = W
  const g = c.getContext('2d')!
  g.fillStyle = '#ffffff'
  // cánh trên
  g.beginPath()
  g.moveTo(6, 62)
  g.bezierCurveTo(18, 8, 112, 2, 122, 40)
  g.bezierCurveTo(126, 54, 104, 66, 64, 64)
  g.closePath()
  g.fill()
  // cánh dưới
  g.beginPath()
  g.moveTo(8, 66)
  g.bezierCurveTo(40, 80, 98, 96, 104, 122)
  g.bezierCurveTo(96, 130, 54, 120, 26, 94)
  g.bezierCurveTo(14, 82, 8, 74, 8, 66)
  g.closePath()
  g.fill()
  // vân/đốm tối nhẹ (sẽ thành sắc đậm hơn của màu bướm)
  g.fillStyle = 'rgba(0,0,0,0.22)'
  g.beginPath()
  g.ellipse(96, 34, 12, 9, -0.4, 0, Math.PI * 2)
  g.fill()
  g.beginPath()
  g.ellipse(70, 100, 10, 8, 0.3, 0, Math.PI * 2)
  g.fill()
  // viền tối
  g.strokeStyle = 'rgba(40,25,20,0.4)'
  g.lineWidth = 2.5
  g.beginPath()
  g.moveTo(6, 62)
  g.bezierCurveTo(18, 8, 112, 2, 122, 40)
  g.bezierCurveTo(126, 54, 104, 66, 64, 64)
  g.moveTo(8, 66)
  g.bezierCurveTo(40, 80, 98, 96, 104, 122)
  g.stroke()
  return new THREE.CanvasTexture(c)
}

// ----- Texture cánh chuồn chuồn (một cánh mảnh dài, trong mờ), thân ở mép TRÁI -----
function dragonflyWingTex(): THREE.CanvasTexture {
  const W = 128
  const H = 48
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const grd = g.createLinearGradient(0, 0, W, 0)
  grd.addColorStop(0, 'rgba(255,255,255,0.65)')
  grd.addColorStop(1, 'rgba(210,235,245,0.15)')
  g.fillStyle = grd
  g.beginPath()
  g.moveTo(4, 24)
  g.bezierCurveTo(30, 6, 110, 8, 124, 22)
  g.bezierCurveTo(112, 38, 30, 40, 4, 24)
  g.closePath()
  g.fill()
  // gân cánh
  g.strokeStyle = 'rgba(120,150,160,0.4)'
  g.lineWidth = 1
  g.beginPath()
  g.moveTo(8, 24)
  g.lineTo(120, 22)
  g.stroke()
  return new THREE.CanvasTexture(c)
}

// Một con bướm/chuồn chuồn bay vòng quanh cây, vỗ cánh.
function Critter({
  spec,
  bflyTex,
  dragTex,
}: {
  spec: Spec
  bflyTex: THREE.Texture
  dragTex: THREE.Texture
}) {
  const root = useRef<THREE.Group>(null)
  const rWing = useRef<THREE.Group>(null)
  const lWing = useRef<THREE.Group>(null)
  const rWing2 = useRef<THREE.Group>(null)
  const lWing2 = useRef<THREE.Group>(null)

  const isDragon = spec.kind === 'dragonfly'
  const tex = isDragon ? dragTex : bflyTex
  const wingW = isDragon ? 0.42 : 0.34
  const wingH = isDragon ? 0.16 : 0.32

  // cánh phải: mặt phẳng x∈[0,wingW], thân ở x=0 (pivot vỗ cánh)
  const wingGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(wingW, wingH)
    g.translate(wingW / 2, 0, 0)
    return g
  }, [wingW, wingH])

  const mat = useMemo(() => {
    return new THREE.MeshLambertMaterial({
      map: tex,
      color: spec.color,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: isDragon ? 0.02 : 0.25,
      depthWrite: !isDragon,
      opacity: isDragon ? 0.7 : 1,
    })
  }, [tex, spec.color, isDragon])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const g = root.current
    if (!g) return
    const ang = t * spec.speed + spec.phase
    g.position.set(
      Math.cos(ang) * spec.radius,
      spec.height + Math.sin(t * spec.bob + spec.phase) * 0.35,
      Math.sin(ang) * spec.radius
    )
    g.rotation.y = -ang + (spec.speed > 0 ? Math.PI / 2 : -Math.PI / 2)
    g.rotation.z = Math.sin(t * 0.7 + spec.phase) * 0.12

    const amp = isDragon ? 0.5 : 1.2
    const f = (Math.sin(t * spec.flap) * 0.5 + 0.5) * amp
    if (rWing.current) rWing.current.rotation.y = f
    if (lWing.current) lWing.current.rotation.y = Math.PI - f
    if (rWing2.current) rWing2.current.rotation.y = f * 0.85
    if (lWing2.current) lWing2.current.rotation.y = Math.PI - f * 0.85
  })

  return (
    <group ref={root}>
      {/* thân */}
      <mesh rotation-z={Math.PI / 2}>
        <capsuleGeometry
          args={[isDragon ? 0.012 : 0.02, isDragon ? 0.44 : 0.16, 3, 6]}
        />
        <meshLambertMaterial color={isDragon ? 0x3a6b4f : 0x4a3a2e} />
      </mesh>

      {/* cặp cánh trước (chuồn chuồn lệch ra trước) */}
      <group ref={rWing} position={[isDragon ? 0.13 : 0, 0, 0]}>
        <mesh geometry={wingGeo} material={mat} />
      </group>
      {/* cánh trái: xoay 180° quanh Y để soi gương */}
      <group ref={lWing} position={[isDragon ? 0.13 : 0, 0, 0]} rotation-y={Math.PI}>
        <mesh geometry={wingGeo} material={mat} />
      </group>

      {/* chuồn chuồn: cặp cánh sau */}
      {isDragon && (
        <>
          <group ref={rWing2} position={[-0.13, 0, 0]}>
            <mesh geometry={wingGeo} material={mat} />
          </group>
          <group ref={lWing2} position={[-0.13, 0, 0]} rotation-y={Math.PI}>
            <mesh geometry={wingGeo} material={mat} />
          </group>
        </>
      )}
    </group>
  )
}

export default function Critters() {
  const isMobile = useIsMobile()
  const bflyTex = useMemo(() => butterflyWingTex(), [])
  const dragTex = useMemo(() => dragonflyWingTex(), [])

  const specs = useMemo<Spec[]>(() => {
    const nB = isMobile ? 2 : 4
    const nD = isMobile ? 1 : 2
    const out: Spec[] = []
    for (let i = 0; i < nB; i++) {
      out.push({
        kind: 'butterfly',
        radius: 2.4 + Math.random() * 2.8,
        height: 1.2 + Math.random() * 2,
        speed: (0.18 + Math.random() * 0.22) * (Math.random() < 0.5 ? 1 : -1),
        phase: Math.random() * Math.PI * 2,
        bob: 0.8 + Math.random() * 0.8,
        flap: 9 + Math.random() * 5,
        color: BFLY_COLORS[(Math.random() * BFLY_COLORS.length) | 0],
      })
    }
    for (let i = 0; i < nD; i++) {
      out.push({
        kind: 'dragonfly',
        radius: 3 + Math.random() * 2.5,
        height: 1.6 + Math.random() * 1.8,
        speed: (0.3 + Math.random() * 0.25) * (Math.random() < 0.5 ? 1 : -1),
        phase: Math.random() * Math.PI * 2,
        bob: 1.2 + Math.random() * 0.8,
        flap: 26 + Math.random() * 10,
        color: 0xcdeaf2,
      })
    }
    return out
  }, [isMobile])

  return (
    <group>
      {specs.map((s, i) => (
        <Critter key={i} spec={s} bflyTex={bflyTex} dragTex={dragTex} />
      ))}
    </group>
  )
}
