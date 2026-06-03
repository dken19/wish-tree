'use client'
import { useMemo } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { groundHeight, slopeQuaternion } from '@/lib/terrain'
import { peakCenter } from '@/lib/peaks'

const TAU = Math.PI * 2

// Texture đá phong hoá: nền cẩm thạch loang + VẾT NỨT + sứt mép + lốm đốm.
function stoneTexture(): THREE.CanvasTexture {
  const S = 128
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  // nền sáng loang nhẹ
  g.fillStyle = '#e9ebe3'
  g.fillRect(0, 0, S, S)
  let seed = 9
  const rnd = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  for (let i = 0; i < 40; i++) {
    const x = rnd() * S
    const y = rnd() * S
    const r = 6 + rnd() * 22
    g.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.25)' : 'rgba(176,178,170,0.22)'
    g.beginPath()
    g.arc(x, y, r, 0, TAU)
    g.fill()
  }
  // vết nứt: vài đường gãy khúc phân nhánh
  const crack = (x0: number, y0: number, ang0: number, steps: number, wdt: number) => {
    g.strokeStyle = 'rgba(96,98,92,0.55)'
    g.lineWidth = wdt
    g.beginPath()
    g.moveTo(x0, y0)
    let x = x0
    let y = y0
    let ang = ang0
    for (let s = 0; s < steps; s++) {
      ang += (rnd() - 0.5) * 0.9
      x += Math.cos(ang) * 10
      y += Math.sin(ang) * 10
      g.lineTo(x, y)
      if (rnd() > 0.7 && wdt > 0.7) crack(x, y, ang + 1.2, 3, wdt * 0.6) // nhánh nứt
    }
    g.stroke()
  }
  crack(rnd() * S, 0, Math.PI / 2 + (rnd() - 0.5), 12, 1.6)
  crack(0, rnd() * S, (rnd() - 0.5), 10, 1.3)
  crack(rnd() * S, rnd() * S, rnd() * TAU, 7, 1.1)
  // sứt mép tối quanh viền (đá vỡ)
  const vg = g.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.72)
  vg.addColorStop(0, 'rgba(120,120,112,0)')
  vg.addColorStop(1, 'rgba(110,112,104,0.4)')
  g.fillStyle = vg
  g.fillRect(0, 0, S, S)
  // lốm đốm rêu/đốm tối
  for (let i = 0; i < 70; i++) {
    g.fillStyle = rnd() > 0.6 ? 'rgba(90,104,70,0.25)' : 'rgba(120,122,114,0.3)'
    g.beginPath()
    g.arc(rnd() * S, rnd() * S, 0.6 + rnd() * 1.6, 0, TAU)
    g.fill()
  }
  return new THREE.CanvasTexture(c)
}

type Slab = { x: number; z: number; yaw: number; w: number; l: number; th: number }

// Đặt mảng phiến đá vào InstancedMesh: bám mặt đất (groundHeight) + nghiêng theo
// sườn (slopeQuaternion). Tính 1 lần lúc dựng -> 0 chi phí runtime.
function placeSlabs(mesh: THREE.InstancedMesh | null, slabs: Slab[], blend: number) {
  if (!mesh) return
  const dummy = new THREE.Object3D()
  const yawQ = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 1, 0)
  slabs.forEach((s, i) => {
    const y = groundHeight(s.x, s.z)
    dummy.position.set(s.x, y + s.th * 0.5 + 0.03, s.z)
    yawQ.setFromAxisAngle(up, s.yaw)
    dummy.quaternion.copy(slopeQuaternion(s.x, s.z, blend)).multiply(yawQ)
    dummy.scale.set(s.w, s.th, s.l)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
  })
  mesh.instanceMatrix.needsUpdate = true
}

// Vòng phiến đá trắng quanh cây + DẢI đá trắng liền mạch dẫn tới ngôi đền.
export default function StonePath() {
  // hộp BO GÓC (bevel nhẹ) cho cảm giác đá vỡ, mép tròn
  const geo = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 3, 0.16), [])
  const stoneTex = useMemo(() => stoneTexture(), [])
  const whiteMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xf2f3ee,
        roughness: 0.95,
        map: stoneTex,
      }),
    [stoneTex]
  )

  // VÒNG phiến đá: ÍT viên, TÁCH XA nhau (lộ cỏ giữa khe), xếp đều theo tiếp tuyến.
  const ring = useMemo<Slab[]>(() => {
    const N = 16
    const R = 5.0
    const arr: Slab[] = []
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU + (Math.random() - 0.5) * 0.05 // gần như đều
      const r = R + (Math.random() - 0.5) * 0.2
      arr.push({
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        yaw: -a + (Math.random() - 0.5) * 0.12, // cạnh dài theo tiếp tuyến
        w: 0.5 + Math.random() * 0.15, // bề ngang (hướng tâm)
        l: 0.8 + Math.random() * 0.2, // ngắn lại -> hở cỏ giữa các viên
        th: 0.07 + Math.random() * 0.03,
      })
    }
    return arr
  }, [])

  // DẢI ĐÁ TRẮNG: từ gốc cây chạy LIỀN MẠCH về hướng đền (đổ dốc xuống thung lũng,
  // mờ dần vào sương). Phiến gối nhau (spacing < length) -> thành dải không đứt.
  const trail = useMemo<Slab[]>(() => {
    const peak = peakCenter(0, 2)
    const len = Math.hypot(peak.x, peak.z) || 1
    const dx = peak.x / len
    const dz = peak.z / len
    const px = -dz // vuông góc để uốn lượn rất nhẹ
    const pz = dx
    const pathYaw = Math.atan2(dx, dz) // cạnh dài chạy DỌC đường
    const arr: Slab[] = []
    const START = 4.6
    const END = 70
    const STEP = 0.9 // < length -> gối nhau thành dải liền
    for (let t = START, i = 0; t <= END; t += STEP, i++) {
      const meander = Math.sin(i * 0.22) * 0.35 // uốn rất nhẹ -> đường thẳng gọn
      const x = dx * t + px * meander
      const z = dz * t + pz * meander
      // hơi rộng để đọc như một con đường, thu nhỏ dần ở xa cho tự nhiên
      const fade = 1 - Math.min(1, (t - START) / (END - START)) * 0.35
      arr.push({
        x,
        z,
        yaw: pathYaw + (Math.random() - 0.5) * 0.08, // ít lệch -> đỡ gập ghềnh
        w: (1.5 + Math.random() * 0.2) * fade, // bề NGANG đường
        l: (1.4 + Math.random() * 0.2) * fade, // dọc đường (gối lên viên sau)
        th: 0.07 + Math.random() * 0.02,
      })
    }
    return arr
  }, [])

  return (
    <group>
      <instancedMesh
        ref={(m) => placeSlabs(m, ring, 0.3)}
        args={[geo, whiteMat, ring.length]}
        receiveShadow
        castShadow
      />
      <instancedMesh
        ref={(m) => placeSlabs(m, trail, 0.4)}
        args={[geo, whiteMat, trail.length]}
        receiveShadow
      />
    </group>
  )
}
