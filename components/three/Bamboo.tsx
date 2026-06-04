'use client'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { windRef } from '@/lib/runtime'
import { makeWindMaterial } from '@/lib/windMaterial'
import { useIsMobile } from './useIsMobile'

const TAU = Math.PI * 2

// Dáng thân trúc (chia sẻ giữa geometry, cành & tán lá)
const BASE_H = 10 // cao (đơn vị local; nhân scale đều mỗi cây)
const NODES = 13 // số đốt -> đốt NGẮN
const CURVE = 0.72 // độ cong NGỌN (lệch X ở đỉnh)
const CURVE_EXP = 2.5 // cong dồn về ngọn

// điểm trên TRỤC thân ở độ cao frac (0..1), đã tính cong + lean + scale
function culmAxisPoint(out: THREE.Vector3, frac: number, sc: number, eul: THREE.Euler) {
  return out
    .set(CURVE * Math.pow(frac, CURVE_EXP), frac * BASE_H, 0)
    .multiplyScalar(sc)
    .applyEuler(eul)
}

// Thân trúc tuỳ biến: thuôn dần, CONG ở ngọn, GỜ NỔI + rãnh tối ở mấu, + vài SỌC
// DỌC xanh đậm. Bóng/sọc bake vào vertex color (material xanh nhân vào).
function makeCulmGeometry(detailed: boolean): THREE.BufferGeometry {
  const rBase = 0.062
  const rTip = 0.014
  const RS = detailed ? 7 : 5
  const intLen = BASE_H / NODES
  const bulgeW = intLen * 0.14
  const bulge = 0.32
  const grooveW = intLen * 0.05

  const ys = new Set<number>()
  const perInt = detailed ? 4 : 3
  for (let n = 0; n < NODES; n++)
    for (let k = 0; k <= perInt; k++) ys.add((n + k / perInt) * intLen)
  const g = 0.05
  const ring = detailed
    ? [-2 * g, -g, -0.4 * g, 0, 0.4 * g, g, 1.8 * g]
    : [-g, 0, g, 1.8 * g]
  for (let n = 1; n < NODES; n++) for (const o of ring) ys.add(n * intLen + o)
  const levels = [...ys].filter((y) => y >= 0 && y <= BASE_H).sort((a, b) => a - b)

  const pos: number[] = []
  const col: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (let j = 0; j < levels.length; j++) {
    const y = levels[j]
    const v = y / BASE_H
    let r = THREE.MathUtils.lerp(rBase, rTip, Math.pow(v, 0.8))
    const np = y / intLen
    const fr = np - Math.floor(np)
    const dNode = Math.min(fr, 1 - fr) * intLen
    if (dNode < bulgeW) {
      const k = 1 - dNode / bulgeW
      r *= 1 + bulge * k * k // gờ nổi quanh mấu
    }
    let shade = 0.92
    if (dNode < grooveW) shade -= 0.36 * (1 - dNode / grooveW) // rãnh tối ở mấu
    if (fr > 0.02 && fr < 0.14) shade += 0.1 // cổ đốt sáng
    shade = Math.min(1, Math.max(0.42, shade))
    const dx = CURVE * Math.pow(v, CURVE_EXP)
    for (let s = 0; s <= RS; s++) {
      const a = (s / RS) * TAU
      // vài SỌC DỌC xanh đậm (2 segment) cho thân có vân
      const stripe = s % RS === 1 || s % RS === 4
      const cr = shade * (stripe ? 0.74 : 1)
      const cg = shade * (stripe ? 0.9 : 1)
      const cb = shade * (stripe ? 0.6 : 1)
      pos.push(Math.cos(a) * r + dx, y, Math.sin(a) * r)
      col.push(cr, cg, cb)
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

// CÀNH cong tự nhiên trong mặt phẳng local X(ngoài)-Y(lên): LÊN rồi CONG XUỐNG.
// sin(t*K): lên (đỉnh ~t=0.45) rồi đi xuống, t=1 xuống dưới gốc một chút.
const BR_REACH = 1.05
const BR_RISE = 0.74
const BR_K = 3.5
function branchPoint(out: THREE.Vector3, t: number): THREE.Vector3 {
  return out.set(BR_REACH * Math.pow(t, 0.92), BR_RISE * Math.sin(t * BR_K), 0)
}
function makeBranchGeo(): THREE.BufferGeometry {
  const SEG = 14
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= SEG; i++) pts.push(branchPoint(new THREE.Vector3(), i / SEG))
  const curve = new THREE.CatmullRomCurve3(pts)
  return new THREE.TubeGeometry(curve, SEG, 0.0095, 5, false)
}

// MỘT lá trúc: phình dưới-giữa, NHỌN ở đầu (lanceolate).
function leafShape(g: CanvasRenderingContext2D, len: number, w: number, col: string) {
  g.fillStyle = col
  g.beginPath()
  g.moveTo(0, 0)
  g.bezierCurveTo(w, len * 0.28, w * 0.85, len * 0.72, 0, len)
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

// TÁN lá: nhiều lá hẹp nhọn XÒE LÊN từ gốc (đón ngọn), KHÔNG rủ xuống.
function fanTexture(): THREE.CanvasTexture {
  const S = 128
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  const greens = ['#5f9242', '#6fa64e', '#558539', '#79b35a', '#8cc065']
  const N = 7
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1)
    const ang = (t - 0.5) * 1.7 // xòe -0.85..0.85 rad quanh trục lên
    const len = (0.52 - Math.abs(t - 0.5) * 0.34) * S // lá giữa dài hơn
    g.save()
    g.translate(S * 0.5, S * 0.97)
    g.rotate(Math.PI + ang) // chĩa LÊN (canvas up) + xòe
    leafShape(g, len, len * 0.11, greens[i % greens.length])
    g.restore()
  }
  return new THREE.CanvasTexture(c)
}

// Hai mặt phẳng vuông góc, gốc ở ĐÁY, xòe LÊN -> tán lá nhìn được mọi hướng.
function makeFanGeo(): THREE.BufferGeometry {
  const pos: number[] = []
  const uv: number[] = []
  const nor: number[] = []
  const addPlane = (rotY: number) => {
    const p = new THREE.PlaneGeometry(1, 1).toNonIndexed()
    p.translate(0, 0.5, 0) // gốc ở đáy -> xòe lên
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

// Rừng trúc: thân CONG có đốt+sọc -> CÀNH chĩa lên-ngoài -> TÁN lá xòe lên đón ngọn.
export default function Bamboo() {
  const isMobile = useIsMobile()
  const CLUSTERS = isMobile ? 26 : 56
  const BR = isMobile ? 3 : 5 // cành mỗi thân (nửa trên)
  const FANS = 2 // tán lá mỗi cành (gốc + ngọn cành -> "chia cành nhỏ")
  const FALLING = isMobile ? 30 : 64

  const culmRef = useRef<THREE.InstancedMesh>(null)
  const branchRef = useRef<THREE.InstancedMesh>(null)
  const fanRef = useRef<THREE.InstancedMesh>(null)
  const fallRef = useRef<THREE.Points>(null)

  const fanTex = useMemo(() => fanTexture(), [])
  const singleLeafTex = useMemo(() => singleLeafTexture(), [])

  const culmGeo = useMemo(() => makeCulmGeometry(!isMobile), [isMobile])
  const branchGeo = useMemo(() => makeBranchGeo(), [])
  const fanGeo = useMemo(() => makeFanGeo(), [])

  const culmMat = useMemo(() => {
    const m = makeWindMaterial({ color: 0x95b863, amp: 0.018, swayZ: 0.012, speed: 0.9, side: THREE.DoubleSide })
    m.vertexColors = true
    return m
  }, [])
  const branchMat = useMemo(
    () => makeWindMaterial({ color: 0x6f8c40, amp: 0.05, swayZ: 0.04, speed: 1.1, side: THREE.DoubleSide }),
    []
  )
  const fanMat = useMemo(() => {
    const m = makeWindMaterial({ color: 0xffffff, amp: 0.09, swayZ: 0.08, speed: 1.4, side: THREE.DoubleSide })
    m.map = fanTex
    m.transparent = true
    m.depthWrite = false
    m.alphaTest = 0.04
    return m
  }, [fanTex])

  // thân theo CỤM (4–8 cây), vòng nền r7.5..19.5
  const data = useMemo(() => {
    const arr: { x: number; z: number; yaw: number; sc: number; lean: number; lz: number }[] = []
    for (let cI = 0; cI < CLUSTERS; cI++) {
      const ca = Math.random() * TAU
      const cr = 7.5 + Math.random() * 12
      const cx = Math.cos(ca) * cr
      const cz = Math.sin(ca) * cr
      const per = 4 + ((Math.random() * 5) | 0)
      const outX = Math.cos(ca)
      const outZ = Math.sin(ca)
      for (let k = 0; k < per; k++) {
        arr.push({
          x: cx + (Math.random() - 0.5) * 1.2,
          z: cz + (Math.random() - 0.5) * 1.2,
          yaw: Math.random() * TAU,
          sc: 0.82 + Math.random() * 0.42,
          lean: outX * 0.05 + (Math.random() - 0.5) * 0.05,
          lz: outZ * 0.05 + (Math.random() - 0.5) * 0.05,
        })
      }
    }
    return arr
  }, [CLUSTERS])
  const CULMS = data.length
  const BRANCH_N = CULMS * BR
  const FAN_N = CULMS * BR * FANS

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
    const branch = branchRef.current
    const fan = fanRef.current
    const eul = new THREE.Euler()
    const brEul = new THREE.Euler()
    const axis = new THREE.Vector3()
    let bi = 0
    let fi = 0
    data.forEach((b, i) => {
      // thân
      dummy.position.set(b.x, 0, b.z)
      dummy.rotation.set(b.lean, b.yaw, b.lz)
      dummy.scale.setScalar(b.sc)
      dummy.updateMatrix()
      culm?.setMatrixAt(i, dummy.matrix)

      eul.set(b.lean, b.yaw, b.lz)
      for (let k = 0; k < BR; k++) {
        // điểm gắn cành: rải đều nửa trên thân (cong-aware)
        const frac = 0.5 + ((k + 0.5) / BR) * 0.46 // 0.5..0.96
        culmAxisPoint(axis, frac, b.sc, eul)
        const ax = b.x + axis.x
        const ay = axis.y
        const az = b.z + axis.z
        const yaw2 = b.yaw + k * 2.2 + Math.random() * 0.7
        const tilt = (Math.random() - 0.5) * 0.5 // arch nghiêng nhẹ khác nhau
        brEul.set(tilt, yaw2, 0)
        // cành ARCH (geometry tự lên rồi cong xuống) -> chỉ xoay yaw + nghiêng nhẹ
        dummy.position.set(ax, ay, az)
        dummy.rotation.copy(brEul)
        dummy.scale.setScalar(b.sc)
        dummy.updateMatrix()
        branch?.setMatrixAt(bi++, dummy.matrix)
        // tán lá bám đường cong cành (gần ngọn cành), xòe LÊN đón ngọn
        for (let f = 0; f < FANS; f++) {
          const tf = FANS > 1 ? 0.55 + f * (0.4 / (FANS - 1)) : 0.8
          branchPoint(axis, tf).multiplyScalar(b.sc).applyEuler(brEul)
          const fSize = (0.5 + Math.random() * 0.32) * b.sc
          dummy.position.set(ax + axis.x, ay + axis.y, az + axis.z)
          dummy.rotation.set((Math.random() - 0.5) * 0.4, yaw2 + (Math.random() - 0.5), (Math.random() - 0.5) * 0.3)
          dummy.scale.setScalar(fSize)
          dummy.updateMatrix()
          fan?.setMatrixAt(fi++, dummy.matrix)
        }
      }
    })
    if (culm) culm.instanceMatrix.needsUpdate = true
    if (branch) branch.instanceMatrix.needsUpdate = true
    if (fan) fan.instanceMatrix.needsUpdate = true
  }, [data, BR, FANS])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const w = windRef.current
    culmMat.tick(t, w)
    branchMat.tick(t, w)
    fanMat.tick(t, w)
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
      <instancedMesh ref={branchRef} args={[branchGeo, branchMat, BRANCH_N]} castShadow />
      <instancedMesh ref={fanRef} args={[fanGeo, fanMat, FAN_N]} />
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
