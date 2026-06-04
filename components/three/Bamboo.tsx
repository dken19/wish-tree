'use client'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { windRef } from '@/lib/runtime'
import { makeWindMaterial } from '@/lib/windMaterial'
import { useIsMobile } from './useIsMobile'

const TAU = Math.PI * 2

// Texture thân trúc: nền sáng + ĐỐT (vạch tối + cổ đốt sáng), lặp dọc -> đốt đều.
function culmTexture(): THREE.CanvasTexture {
  const W = 16
  const H = 128
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const grd = g.createLinearGradient(0, 0, W, 0)
  grd.addColorStop(0, '#79924f')
  grd.addColorStop(0.5, '#eef3d8')
  grd.addColorStop(1, '#79924f')
  g.fillStyle = grd
  g.fillRect(0, 0, W, H)
  g.fillStyle = 'rgba(54,66,32,0.85)'
  g.fillRect(0, H - 6, W, 5) // vạch đốt tối
  g.fillStyle = 'rgba(255,255,255,0.4)'
  g.fillRect(0, H - 9, W, 2) // cổ đốt sáng
  const t = new THREE.CanvasTexture(c)
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.RepeatWrapping
  t.repeat.set(1, 7)
  return t
}

// MỘT lá trúc thật: phình dưới-giữa, NHỌN ở đầu (lanceolate). Dùng cho lá rơi.
function leafShape(g: CanvasRenderingContext2D, len: number, w: number, col: string) {
  g.fillStyle = col
  g.beginPath()
  g.moveTo(0, 0) // cuống
  g.bezierCurveTo(w, len * 0.28, w * 0.85, len * 0.72, 0, len) // mép phải -> đầu nhọn
  g.bezierCurveTo(-w * 0.85, len * 0.72, -w, len * 0.28, 0, 0)
  g.fill()
  g.strokeStyle = 'rgba(255,255,255,0.16)'
  g.lineWidth = 0.8
  g.beginPath()
  g.moveTo(0, 0)
  g.lineTo(0, len)
  g.stroke()
}

function singleLeafTexture(): THREE.CanvasTexture {
  const S = 64
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  g.translate(S / 2, S * 0.12)
  leafShape(g, S * 0.78, S * 0.12, '#6fa64e')
  return new THREE.CanvasTexture(c)
}

// NHÁNH LÁ rủ: cuống mảnh + nhiều lá hẹp nhọn rủ xuống (giống ảnh thật).
function sprigTexture(): THREE.CanvasTexture {
  const S = 128
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  const greens = ['#5f9242', '#6fa64e', '#558539', '#79b35a']
  // cuống cong nhẹ từ trên xuống
  g.strokeStyle = '#7a9a48'
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(S * 0.5, 4)
  g.quadraticCurveTo(S * 0.6, S * 0.55, S * 0.5, S - 6)
  g.stroke()
  // lá rủ hai bên, xen kẽ, đầu nhọn chĩa xuống-ngoài
  const N = 7
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) / N
    const sx = S * 0.5 + Math.sin(t * Math.PI) * S * 0.1
    const sy = 6 + t * (S - 14)
    const side = i % 2 ? 1 : -1
    const len = (0.42 - t * 0.12) * S
    g.save()
    g.translate(sx, sy)
    g.rotate(side * 0.9 + 0.5) // chĩa xuống & ra ngoài
    leafShape(g, len, len * 0.1, greens[i % greens.length])
    g.restore()
  }
  return new THREE.CanvasTexture(c)
}

// Hai mặt phẳng vuông góc (chữ thập) -> nhánh lá nhìn được từ mọi hướng.
function makeCross(): THREE.BufferGeometry {
  const pos: number[] = []
  const uv: number[] = []
  const nor: number[] = []
  const addPlane = (rotY: number) => {
    const p = new THREE.PlaneGeometry(1, 1).toNonIndexed()
    p.translate(0, -0.5, 0) // treo xuống từ điểm gắn (đỉnh)
    p.rotateY(rotY)
    const pp = p.attributes.position as THREE.BufferAttribute
    const pu = p.attributes.uv as THREE.BufferAttribute
    const pn = p.attributes.normal as THREE.BufferAttribute
    for (let i = 0; i < pp.count; i++) {
      pos.push(pp.getX(i), pp.getY(i), pp.getZ(i))
      uv.push(pu.getX(i), pu.getY(i))
      nor.push(pn.getX(i), pn.getY(i), pn.getZ(i))
    }
    p.dispose()
  }
  addPlane(0)
  addPlane(Math.PI / 2)
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  return out
}

// Rừng trúc: thân CÓ ĐỐT mọc theo CỤM + nhánh lá rủ dọc thân + LÁ ĐƠN rơi lả tả.
export default function Bamboo() {
  const isMobile = useIsMobile()
  const CLUSTERS = isMobile ? 26 : 56 // rừng dày hơn (instanced nên vẫn nhẹ)
  const SPRIGS = isMobile ? 2 : 3 // nhánh lá mỗi thân
  const FALLING = isMobile ? 30 : 64

  const culmRef = useRef<THREE.InstancedMesh>(null)
  const sprigRef = useRef<THREE.InstancedMesh>(null)
  const fallRef = useRef<THREE.Points>(null)

  const culmTex = useMemo(() => culmTexture(), [])
  const sprigTex = useMemo(() => sprigTexture(), [])
  const singleLeafTex = useMemo(() => singleLeafTexture(), [])

  const culmGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.035, 0.06, 1, 7, 8)
    g.translate(0, 0.5, 0)
    return g
  }, [])
  const sprigGeo = useMemo(() => makeCross(), [])

  const culmMat = useMemo(() => {
    const m = makeWindMaterial({ color: 0x9ec06a, amp: 0.04, swayZ: 0.035, speed: 1.0, side: THREE.DoubleSide })
    m.map = culmTex
    return m
  }, [culmTex])
  const sprigMat = useMemo(() => {
    const m = makeWindMaterial({ color: 0xffffff, amp: 0.08, swayZ: 0.07, speed: 1.3, side: THREE.DoubleSide })
    m.map = sprigTex
    m.transparent = true
    m.depthWrite = false
    m.alphaTest = 0.04
    return m
  }, [sprigTex])

  // thân mọc theo CỤM (3–7 cây sát nhau, toả nhẹ ra ngoài), vòng nền r8..24
  const data = useMemo(() => {
    const arr: { x: number; z: number; yaw: number; h: number; lean: number; lz: number }[] = []
    for (let cI = 0; cI < CLUSTERS; cI++) {
      const ca = Math.random() * TAU
      const cr = 7.5 + Math.random() * 12 // vòng sát hơn -> tường trúc dày
      const cx = Math.cos(ca) * cr
      const cz = Math.sin(ca) * cr
      const per = 4 + ((Math.random() * 5) | 0) // 4–8 cây/cụm
      const outX = Math.cos(ca)
      const outZ = Math.sin(ca)
      for (let k = 0; k < per; k++) {
        arr.push({
          x: cx + (Math.random() - 0.5) * 1.2,
          z: cz + (Math.random() - 0.5) * 1.2,
          yaw: Math.random() * TAU,
          h: 7 + Math.random() * 6,
          lean: outX * 0.06 + (Math.random() - 0.5) * 0.06,
          lz: outZ * 0.06 + (Math.random() - 0.5) * 0.06,
        })
      }
    }
    return arr
  }, [CLUSTERS])
  const CULMS = data.length
  const SPRIG_N = CULMS * SPRIGS

  // lá đơn rơi: trạng thái JS
  const fall = useMemo(() => {
    const pos = new Float32Array(FALLING * 3)
    const st: { vy: number; ph: number; sw: number; r: number; a: number }[] = []
    for (let i = 0; i < FALLING; i++) {
      const a = Math.random() * TAU
      const r = Math.random() * 11
      pos[i * 3] = Math.cos(a) * r
      pos[i * 3 + 1] = Math.random() * 10
      pos[i * 3 + 2] = Math.sin(a) * r
      st.push({ vy: 0.25 + Math.random() * 0.35, ph: Math.random() * TAU, sw: 0.4 + Math.random() * 0.6, r, a })
    }
    return { pos, st }
  }, [FALLING])

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()
    const culm = culmRef.current
    const sprig = sprigRef.current
    let si = 0
    data.forEach((b, i) => {
      dummy.position.set(b.x, 0, b.z)
      dummy.rotation.set(b.lean, b.yaw, b.lz)
      dummy.scale.set(1, b.h, 1)
      dummy.updateMatrix()
      culm?.setMatrixAt(i, dummy.matrix)
      // nhánh lá rủ dọc nửa trên thân
      for (let s = 0; s < SPRIGS; s++) {
        const frac = 0.55 + (s / Math.max(1, SPRIGS - 1)) * 0.4
        const yaw = b.yaw + s * 2.4 + Math.random() * 0.6
        dummy.position.set(
          b.x + Math.cos(yaw) * 0.18,
          b.h * frac,
          b.z + Math.sin(yaw) * 0.18
        )
        dummy.rotation.set(0.25, yaw, 0) // hơi chúi xuống cho lá rủ
        const sc = 1.3 + Math.random() * 0.8
        dummy.scale.set(sc, sc, sc)
        dummy.updateMatrix()
        sprig?.setMatrixAt(si++, dummy.matrix)
      }
    })
    if (culm) culm.instanceMatrix.needsUpdate = true
    if (sprig) sprig.instanceMatrix.needsUpdate = true
  }, [data, SPRIGS])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const w = windRef.current
    culmMat.tick(t, w)
    sprigMat.tick(t, w)
    const pts = fallRef.current
    if (pts) {
      const arr = (pts.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array
      const d = Math.min(dt, 0.05)
      for (let i = 0; i < fall.st.length; i++) {
        const s = fall.st[i]
        let y = arr[i * 3 + 1] - s.vy * d
        const swing = Math.sin(t * s.sw + s.ph) * 0.35 * (0.4 + w)
        if (y < 0.05) y = 9 + Math.random() * 2
        arr[i * 3] = Math.cos(s.a) * s.r + swing
        arr[i * 3 + 1] = y
        arr[i * 3 + 2] = Math.sin(s.a) * s.r + Math.cos(t * s.sw + s.ph) * 0.2 * w
      }
      ;(pts.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
    }
  })

  return (
    <group>
      <instancedMesh ref={culmRef} args={[culmGeo, culmMat, CULMS]} castShadow />
      <instancedMesh ref={sprigRef} args={[sprigGeo, sprigMat, SPRIG_N]} />
      <points ref={fallRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[fall.pos, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={singleLeafTex}
          size={0.42}
          sizeAttenuation
          transparent
          depthWrite={false}
          alphaTest={0.04}
          color={0x86b45f}
        />
      </points>
    </group>
  )
}
