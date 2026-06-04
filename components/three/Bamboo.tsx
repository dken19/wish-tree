'use client'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { windRef } from '@/lib/runtime'
import { makeWindMaterial } from '@/lib/windMaterial'
import { useIsMobile } from './useIsMobile'

const TAU = Math.PI * 2

// Dáng thân trúc (chia sẻ giữa geometry & vị trí nhánh lá)
const BASE_H = 10 // cao (đơn vị local; nhân scale đều mỗi cây)
const NODES = 13 // số đốt -> đốt NGẮN
const CURVE = 0.72 // độ cong NGỌN (lệch X ở đỉnh)
const CURVE_EXP = 2.5 // cong dồn về ngọn

// Thân trúc tuỳ biến: thuôn dần lên ngọn, CONG ở ngọn, có GỜ NỔI + rãnh tối ở
// mỗi mấu đốt (như tre thật). Bóng mấu bake vào vertex color. Lấy mẫu DÀY quanh
// mấu để gờ sắc nét mà tổng đỉnh vẫn ít.
function makeCulmGeometry(detailed: boolean): THREE.BufferGeometry {
  const rBase = 0.062
  const rTip = 0.014
  const RS = detailed ? 6 : 5
  const intLen = BASE_H / NODES
  const bulgeW = intLen * 0.14 // bề rộng gờ nổi
  const bulge = 0.32 // gờ phình thêm bao nhiêu (theo bán kính)
  const grooveW = intLen * 0.05 // rãnh tối sát mấu

  // danh sách độ cao lấy mẫu: thưa dọc đốt + DÀY quanh mỗi mấu
  const ys = new Set<number>()
  const perInt = detailed ? 4 : 3
  for (let n = 0; n < NODES; n++)
    for (let k = 0; k <= perInt; k++) ys.add((n + k / perInt) * intLen)
  const g = 0.05
  const ring = detailed
    ? [-2 * g, -g, -0.4 * g, 0, 0.4 * g, g, 1.8 * g]
    : [-g, 0, g, 1.8 * g]
  for (let n = 1; n < NODES; n++)
    for (const o of ring) ys.add(n * intLen + o)
  const levels = [...ys].filter((y) => y >= 0 && y <= BASE_H).sort((a, b) => a - b)

  const pos: number[] = []
  const col: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (let j = 0; j < levels.length; j++) {
    const y = levels[j]
    const v = y / BASE_H
    let r = THREE.MathUtils.lerp(rBase, rTip, Math.pow(v, 0.8))
    // khoảng cách tới mấu gần nhất
    const np = y / intLen
    const fr = np - Math.floor(np)
    const dNode = Math.min(fr, 1 - fr) * intLen
    if (dNode < bulgeW) {
      const k = 1 - dNode / bulgeW
      r *= 1 + bulge * k * k // gờ nổi quanh mấu
    }
    // bóng: rãnh tối ngay mấu + cổ đốt sáng ngay TRÊN mấu
    let shade = 0.92
    if (dNode < grooveW) shade -= 0.36 * (1 - dNode / grooveW)
    if (fr > 0.02 && fr < 0.14) shade += 0.1
    shade = Math.min(1, Math.max(0.42, shade))
    const dx = CURVE * Math.pow(v, CURVE_EXP) // cong về ngọn
    for (let s = 0; s <= RS; s++) {
      const a = (s / RS) * TAU
      pos.push(Math.cos(a) * r + dx, y, Math.sin(a) * r)
      col.push(shade, shade, shade)
      uv.push(s / RS, v)
    }
  }
  for (let j = 0; j < levels.length - 1; j++) {
    for (let s = 0; s < RS; s++) {
      const a = j * (RS + 1) + s
      const b = a + 1
      const c = a + (RS + 1)
      const d = c + 1
      idx.push(a, b, d, a, d, c)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setIndex(idx)
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geo.computeVertexNormals()
  return geo
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

// Rừng trúc: thân CÓ ĐỐT + NGỌN CONG mọc theo CỤM + nhánh lá rủ + LÁ ĐƠN rơi.
export default function Bamboo() {
  const isMobile = useIsMobile()
  const CLUSTERS = isMobile ? 26 : 56 // rừng dày hơn (instanced nên vẫn nhẹ)
  const SPRIGS = isMobile ? 2 : 3 // nhánh lá mỗi thân
  const FALLING = isMobile ? 30 : 64

  const culmRef = useRef<THREE.InstancedMesh>(null)
  const sprigRef = useRef<THREE.InstancedMesh>(null)
  const fallRef = useRef<THREE.Points>(null)

  const sprigTex = useMemo(() => sprigTexture(), [])
  const singleLeafTex = useMemo(() => singleLeafTexture(), [])

  const culmGeo = useMemo(() => makeCulmGeometry(!isMobile), [isMobile])
  const sprigGeo = useMemo(() => makeCross(), [])

  const culmMat = useMemo(() => {
    // bóng mấu = vertex color; uốn gió nhẹ (geometry cao nên amp nhỏ)
    const m = makeWindMaterial({
      color: 0x95b863,
      amp: 0.018,
      swayZ: 0.012,
      speed: 0.9,
      side: THREE.DoubleSide,
    })
    m.vertexColors = true
    return m
  }, [])
  const sprigMat = useMemo(() => {
    const m = makeWindMaterial({ color: 0xffffff, amp: 0.08, swayZ: 0.07, speed: 1.3, side: THREE.DoubleSide })
    m.map = sprigTex
    m.transparent = true
    m.depthWrite = false
    m.alphaTest = 0.04
    return m
  }, [sprigTex])

  // thân mọc theo CỤM (4–8 cây sát nhau, toả nhẹ ra ngoài), vòng nền r7.5..19.5
  const data = useMemo(() => {
    const arr: { x: number; z: number; yaw: number; sc: number; lean: number; lz: number }[] = []
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
          yaw: Math.random() * TAU, // hướng cong ngẫu nhiên
          sc: 0.82 + Math.random() * 0.42, // cao 8.2..12.4
          lean: outX * 0.05 + (Math.random() - 0.5) * 0.05,
          lz: outZ * 0.05 + (Math.random() - 0.5) * 0.05,
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
    const axis = new THREE.Vector3()
    const eul = new THREE.Euler()
    let si = 0
    data.forEach((b, i) => {
      dummy.position.set(b.x, 0, b.z)
      dummy.rotation.set(b.lean, b.yaw, b.lz)
      dummy.scale.setScalar(b.sc) // scale ĐỀU -> giữ tỉ lệ đốt
      dummy.updateMatrix()
      culm?.setMatrixAt(i, dummy.matrix)
      // nhánh lá rủ ở nửa trên thân — bám theo NGỌN CONG
      eul.set(b.lean, b.yaw, b.lz)
      for (let s = 0; s < SPRIGS; s++) {
        const frac = 0.55 + (s / Math.max(1, SPRIGS - 1)) * 0.38 // 0.55..0.93
        const dx = CURVE * Math.pow(frac, CURVE_EXP)
        axis.set(dx, frac * BASE_H, 0).multiplyScalar(b.sc).applyEuler(eul)
        const yaw2 = b.yaw + s * 2.4 + Math.random() * 0.6
        dummy.position.set(
          b.x + axis.x + Math.cos(yaw2) * 0.14,
          axis.y,
          b.z + axis.z + Math.sin(yaw2) * 0.14
        )
        dummy.rotation.set(0.25, yaw2, 0) // hơi chúi xuống cho lá rủ
        const scl = (1.3 + Math.random() * 0.8) * b.sc
        dummy.scale.setScalar(scl)
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
