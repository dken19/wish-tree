'use client'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { windRef } from '@/lib/runtime'
import { makeWindMaterial } from '@/lib/windMaterial'
import { mulberry32 } from '@/lib/tree'
import { groundHeight, rEdgeAt, slopeQuaternion } from '@/lib/terrain'
import { peakCenter } from '@/lib/peaks'
import { useIsMobile } from './useIsMobile'

const GREENS = [0x8bbf6a, 0x9ccd78, 0x7baf5c, 0xa9d489, 0x6fa552, 0xb6dd8e, 0x84bb60]

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

/**
 * Khóm cỏ: 5 lá THON (rộng gốc -> nhọn ngọn), cong ra ngoài, xoè quanh gốc.
 * Vertex color: gốc tối -> ngọn sáng (nhân với màu instance). Pháp tuyến hướng LÊN cho cả lá
 * -> sáng mềm, không lá nào đen kịt khi quay lưng ánh sáng (mẹo dựng cỏ phổ biến).
 */
function makeTuft(BLADES = 5, SEG = 4): THREE.BufferGeometry {
  const pos: number[] = []
  const col: number[] = []
  const idx: number[] = []
  for (let b = 0; b < BLADES; b++) {
    const yaw = (b / BLADES) * Math.PI * 2 + (b % 2) * 0.4
    const lean = 0.25 + (b % 3) * 0.12 // độ ngả ra ngoài
    const h = 0.26 + ((b * 37) % 10) / 100
    const w = 0.03 + (b % 2) * 0.008
    const cy = Math.cos(yaw)
    const sy = Math.sin(yaw)
    const base = pos.length / 3
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG
      const half = w * (1 - t) * 0.5 + 0.002
      const out = lean * h * t * t // cong dần ra ngoài
      const y = h * t
      // tâm lá dịch theo hướng yaw, bề ngang vuông góc với yaw
      const cx = out * cy
      const cz = out * sy
      pos.push(cx - sy * half, y, cz + cy * half, cx + sy * half, y, cz - cy * half)
      const k = 0.42 + 0.58 * t
      col.push(k, k, k, k, k, k)
      if (i < SEG) {
        const a = base + i * 2
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  const n = new Float32Array(pos.length)
  for (let i = 1; i < n.length; i += 3) n[i] = 1
  g.setAttribute('normal', new THREE.BufferAttribute(n, 3))
  g.setIndex(idx)
  return g
}

export default function Meadow() {
  const isMobile = useIsMobile()
  // cỏ phủ KÍN đồi, 2 lớp: GẦN (đỉnh phẳng, khóm 4 lá) + XA (sườn trên tới ~26m, khóm 3 lá to, rẻ hơn)
  const GRASS = isMobile ? 3200 : 9000
  const GRASS_FAR = isMobile ? 1800 : 5200
  const REED = isMobile ? 30 : 80
  const YELLOW = isMobile ? 34 : 90

  // ---------- Cỏ thường (instanced, gió GPU) ----------
  const grassRef = useRef<THREE.InstancedMesh>(null)
  const grassGeo = useMemo(() => makeTuft(4, 3), [])
  const farRef = useRef<THREE.InstancedMesh>(null)
  const farGeo = useMemo(() => makeTuft(3, 2), [])
  const grassMat = useMemo(() => {
    const m = makeWindMaterial({ amp: 0.14, swayZ: 0.09, speed: 1.6 })
    m.vertexColors = true // gốc tối -> ngọn sáng
    return m
  }, [])
  const [grassData, farData] = useMemo(() => {
    type Tuft = { x: number; z: number; yaw: number; h: number; w: number; color: number }
    const peak = peakCenter(0, 2)
    const pl = Math.hypot(peak.x, peak.z) || 1
    const dx = peak.x / pl
    const dz = peak.z / pl
    // chỗ KHÔNG mọc cỏ: gốc cây, vòng phiến đá r≈5, dải đá về đền, bàn thư pháp
    const blocked = (x: number, z: number, r: number) => {
      if (r < 1.0) return true
      if (Math.abs(r - 5) < 0.3) return true
      const along = x * dx + z * dz
      const lat = Math.abs(-x * dz + z * dx)
      if (along > 4.3 && lat < 1.05) return true
      if (Math.hypot(x - 2.4, z - 1.7) < 0.85) return true
      return false
    }
    const make = (n: number, seed: number, rMin: number, rMax: (a: number) => number, scale: number) => {
      const rng = mulberry32(seed) // seed cố định -> thảm cỏ KHÔNG đổi
      const arr: Tuft[] = []
      let guard = 0
      while (arr.length < n && guard++ < n * 3) {
        const a = rng() * Math.PI * 2
        const hi = rMax(a)
        // phân bố đều theo DIỆN TÍCH trong vành [rMin, hi]
        const r = Math.sqrt(rMin * rMin + rng() * (hi * hi - rMin * rMin))
        const x = Math.cos(a) * r
        const z = Math.sin(a) * r
        if (blocked(x, z, r)) continue
        arr.push({
          x,
          z,
          yaw: rng() * Math.PI * 2,
          h: (0.7 + rng() * 0.8) * scale,
          w: scale * (0.9 + rng() * 0.3),
          color: GREENS[(rng() * GREENS.length) | 0],
        })
      }
      return arr
    }
    const near = make(GRASS, 0x6a55 + GRASS, 0.9, (a) => rEdgeAt(a) + 1.5, 1)
    const far = make(GRASS_FAR, 0x7b66 + GRASS_FAR, 0, (a) => rEdgeAt(a) + 17, 1.5).filter(
      (t) => Math.hypot(t.x, t.z) > rEdgeAt(Math.atan2(t.z, t.x)) + 0.8
    )
    return [near, far]
  }, [GRASS, GRASS_FAR])

  // ---------- Cỏ lau (thân + bông trắng, cùng transform, gió GPU) ----------
  const stalkRef = useRef<THREE.InstancedMesh>(null)
  const plumeRef = useRef<THREE.InstancedMesh>(null)
  const plumeTex = useMemo(() => softPlume(), [])
  const stalkGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.04, 0.8, 1, 5)
    g.translate(0, 0.4, 0)
    return g
  }, [])
  const plumeGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.26, 0.54, 1, 1)
    g.translate(0, 0.92, 0) // bông to ở đỉnh thân -> gió uốn mạnh (wH lớn)
    return g
  }, [])
  const stalkMat = useMemo(
    () => makeWindMaterial({ color: 0xafbe80, amp: 0.07, swayZ: 0.05, speed: 1.3 }),
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
    const rng = mulberry32(0xd33d + REED) // seed cố định -> cỏ lau KHÔNG đổi
    for (let i = 0; i < REED; i++) {
      const a = rng() * Math.PI * 2
      // cỏ lau dồn ra RÌA đồng cỏ (4..8) thành bụi lau viền quanh, không lưa thưa giữa sân
      const r = 4 + rng() * 4
      arr.push({
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        yaw: rng() * Math.PI,
        s: 0.75 + rng() * 0.55,
      })
    }
    return arr
  }, [REED])

  // ---------- Hoa vàng (point sprite, thấp) ----------
  const flowerRef = useRef<THREE.Points>(null)
  const flowerTex = useMemo(() => yellowFlower(), [])
  const flowerPos = useMemo(() => {
    const rng = mulberry32(0xf10e + YELLOW) // seed cố định -> hoa vàng KHÔNG đổi
    const pos = new Float32Array(YELLOW * 3)
    for (let i = 0; i < YELLOW; i++) {
      const a = rng() * Math.PI * 2
      const r = 1.2 + Math.sqrt(rng()) * 6.6
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      pos[i * 3] = x
      pos[i * 3 + 1] = groundHeight(x, z) + 0.16 + rng() * 0.2
      pos[i * 3 + 2] = z
    }
    return pos
  }, [YELLOW])

  // ----- nạp ma trận một lần -----
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()
    const col = new THREE.Color()
    const yawQ = new THREE.Quaternion()
    const yAxis = new THREE.Vector3(0, 1, 0)
    const fill = (mesh: THREE.InstancedMesh | null, list: typeof grassData) => {
      if (!mesh) return
      list.forEach((b, i) => {
        // bám đúng cao độ đất + nghiêng theo sườn (0.6) rồi mới xoay quanh trục thân
        dummy.position.set(b.x, groundHeight(b.x, b.z), b.z)
        dummy.quaternion
          .copy(slopeQuaternion(b.x, b.z, 0.6))
          .multiply(yawQ.setFromAxisAngle(yAxis, b.yaw))
        dummy.scale.set(b.w, b.h, b.w)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
        mesh.setColorAt(i, col.set(b.color))
      })
      mesh.count = list.length
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.computeBoundingSphere()
    }
    fill(grassRef.current, grassData)
    fill(farRef.current, farData)
    const stalk = stalkRef.current
    const plume = plumeRef.current
    reedData.forEach((b, i) => {
      dummy.position.set(b.x, groundHeight(b.x, b.z), b.z)
      dummy.quaternion
        .copy(slopeQuaternion(b.x, b.z, 0.5))
        .multiply(yawQ.setFromAxisAngle(yAxis, b.yaw))
      dummy.scale.set(1, b.s, 1)
      dummy.updateMatrix()
      stalk?.setMatrixAt(i, dummy.matrix)
      plume?.setMatrixAt(i, dummy.matrix)
    })
    if (stalk) stalk.instanceMatrix.needsUpdate = true
    if (plume) plume.instanceMatrix.needsUpdate = true
  }, [grassData, farData, reedData])

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
      <instancedMesh ref={farRef} args={[farGeo, grassMat, GRASS_FAR]} />
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
