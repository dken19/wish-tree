'use client'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { windRef } from '@/lib/runtime'
import { makeWindMaterial } from '@/lib/windMaterial'
import { useIsMobile } from './useIsMobile'

const GREENS = [0x8bbf6a, 0x9ccd78, 0x7baf5c, 0xa9d489, 0x6fa552]

// Texture mềm hình bông (gradient) cho bông lau / nhụy
function softPlume(): THREE.CanvasTexture {
  const S = 128
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(S / 2, S / 2, 2, S / 2, S / 2, S / 2)
  grd.addColorStop(0, 'rgba(255,255,255,0.95)')
  grd.addColorStop(0.5, 'rgba(248,244,236,0.55)')
  grd.addColorStop(1, 'rgba(245,240,230,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, S, S)
  return new THREE.CanvasTexture(c)
}

// Hoa vàng nhỏ (5 cánh)
function yellowFlower(): THREE.CanvasTexture {
  const S = 128
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  g.translate(S / 2, S / 2)
  for (let i = 0; i < 5; i++) {
    g.save()
    g.rotate((i / 5) * Math.PI * 2)
    const grd = g.createRadialGradient(0, -26, 3, 0, -26, 22)
    grd.addColorStop(0, 'rgba(255,238,150,0.98)')
    grd.addColorStop(0.6, 'rgba(255,210,70,0.9)')
    grd.addColorStop(1, 'rgba(255,200,60,0)')
    g.fillStyle = grd
    g.beginPath()
    g.ellipse(0, -26, 13, 20, 0, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }
  const ctr = g.createRadialGradient(0, 0, 0, 0, 0, 11)
  ctr.addColorStop(0, 'rgba(196,120,30,0.95)')
  ctr.addColorStop(1, 'rgba(196,120,30,0)')
  g.fillStyle = ctr
  g.beginPath()
  g.arc(0, 0, 11, 0, Math.PI * 2)
  g.fill()
  return new THREE.CanvasTexture(c)
}

export default function Meadow() {
  const isMobile = useIsMobile()
  const GRASS = isMobile ? 280 : 850
  const REED = isMobile ? 40 : 120
  const YELLOW = isMobile ? 22 : 60

  // ---------- Cỏ thường (instanced, gió GPU) ----------
  const grassRef = useRef<THREE.InstancedMesh>(null)
  const grassGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.06, 0.5, 1, 4)
    g.translate(0, 0.25, 0)
    return g
  }, [])
  const grassMat = useMemo(
    () => makeWindMaterial({ amp: 0.14, swayZ: 0.09, speed: 1.6 }),
    []
  )
  const grassData = useMemo(() => {
    const arr: { x: number; z: number; yaw: number; h: number; color: number }[] =
      []
    for (let i = 0; i < GRASS; i++) {
      const a = Math.random() * Math.PI * 2
      const r = 1.3 + Math.random() * 7.4
      arr.push({
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        yaw: Math.random() * Math.PI,
        h: 0.7 + Math.random() * 1.0,
        color: GREENS[(Math.random() * GREENS.length) | 0],
      })
    }
    return arr
  }, [GRASS])

  // ---------- Cỏ lau (thân + bông trắng, cùng transform, gió GPU) ----------
  const stalkRef = useRef<THREE.InstancedMesh>(null)
  const plumeRef = useRef<THREE.InstancedMesh>(null)
  const plumeTex = useMemo(() => softPlume(), [])
  const stalkGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.04, 1.25, 1, 5)
    g.translate(0, 0.62, 0)
    return g
  }, [])
  const plumeGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.22, 0.5, 1, 1)
    g.translate(0, 1.4, 0) // bông ở đỉnh thân -> gió uốn mạnh (wH lớn)
    return g
  }, [])
  const stalkMat = useMemo(
    () => makeWindMaterial({ color: 0x9aae67, amp: 0.07, swayZ: 0.05, speed: 1.3 }),
    []
  )
  const plumeMat = useMemo(() => {
    const m = makeWindMaterial({ color: 0xfdf7ec, amp: 0.07, swayZ: 0.05, speed: 1.3 })
    m.map = plumeTex
    m.transparent = true
    m.depthWrite = false
    return m
  }, [plumeTex])
  const reedData = useMemo(() => {
    const arr: { x: number; z: number; yaw: number; s: number }[] = []
    for (let i = 0; i < REED; i++) {
      const a = Math.random() * Math.PI * 2
      const r = 3 + Math.random() * 6
      arr.push({
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        yaw: Math.random() * Math.PI,
        s: 0.8 + Math.random() * 0.7,
      })
    }
    return arr
  }, [REED])

  // ---------- Hoa vàng (point sprite, thấp) ----------
  const flowerRef = useRef<THREE.Points>(null)
  const flowerTex = useMemo(() => yellowFlower(), [])
  const flowerPos = useMemo(() => {
    const pos = new Float32Array(YELLOW * 3)
    for (let i = 0; i < YELLOW; i++) {
      const a = Math.random() * Math.PI * 2
      const r = 1.5 + Math.random() * 6.5
      pos[i * 3] = Math.cos(a) * r
      pos[i * 3 + 1] = 0.18 + Math.random() * 0.22
      pos[i * 3 + 2] = Math.sin(a) * r
    }
    return pos
  }, [YELLOW])

  // ----- nạp ma trận một lần -----
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()
    const col = new THREE.Color()
    const grass = grassRef.current
    if (grass) {
      grassData.forEach((b, i) => {
        dummy.position.set(b.x, 0, b.z)
        dummy.rotation.set(0, b.yaw, 0)
        dummy.scale.set(1, b.h, 1)
        dummy.updateMatrix()
        grass.setMatrixAt(i, dummy.matrix)
        grass.setColorAt(i, col.set(b.color))
      })
      grass.instanceMatrix.needsUpdate = true
      if (grass.instanceColor) grass.instanceColor.needsUpdate = true
    }
    const stalk = stalkRef.current
    const plume = plumeRef.current
    reedData.forEach((b, i) => {
      dummy.position.set(b.x, 0, b.z)
      dummy.rotation.set(0, b.yaw, 0)
      dummy.scale.set(1, b.s, 1)
      dummy.updateMatrix()
      stalk?.setMatrixAt(i, dummy.matrix)
      plume?.setMatrixAt(i, dummy.matrix)
    })
    if (stalk) stalk.instanceMatrix.needsUpdate = true
    if (plume) plume.instanceMatrix.needsUpdate = true
  }, [grassData, reedData])

  // ----- cập nhật gió GPU: chỉ vài uniform mỗi frame -----
  useFrame((state) => {
    const t = state.clock.elapsedTime
    const w = windRef.current
    grassMat.tick(t, w)
    stalkMat.tick(t, w)
    plumeMat.tick(t, w)
    // hoa vàng đung đưa rất nhẹ
    const f = flowerRef.current
    if (f) {
      f.rotation.z = Math.sin(t * 0.6) * 0.02 * w
    }
  })

  return (
    <group>
      <instancedMesh ref={grassRef} args={[grassGeo, grassMat, GRASS]} />
      <instancedMesh ref={stalkRef} args={[stalkGeo, stalkMat, REED]} />
      <instancedMesh ref={plumeRef} args={[plumeGeo, plumeMat, REED]} />
      <points ref={flowerRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[flowerPos, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={flowerTex}
          size={0.34}
          sizeAttenuation
          transparent
          depthWrite={false}
          alphaTest={0.01}
        />
      </points>
    </group>
  )
}
