'use client'
import { useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32 } from '@/lib/tree'
import { CLOUD_SEA_Y } from '@/lib/peaks'
import { GROUND_FADE_R, VALLEY } from '@/lib/terrain'
import { FAR_R0, FAR_R1, HAMLETS, farHeight, farSlope, fbm, terraceMask, vnoise } from '@/lib/farTerrain'
import { SHADER_OUTRO, skyUniforms } from '@/lib/skyPalette'
import { useIsMobile } from './useIsMobile'

// CẢNH XA LIỀN MẠCH: lưới địa hình cực (r 56→340, ô nhỏ ở gần, to dần ra xa) theo farHeight
// + RỪNG cây (instanced) phủ sườn + BẢN LÀNG (nhà instanced) trên cao nguyên có ruộng bậc thang.
// Chung 1 quy luật sáng tối (theo uSunDir/thời tiết) + phối cảnh khí quyển + sương thung lũng.
// DỰNG DẦN (không chặn màn chờ): 4 vành gần -> xa, mỗi khung hình chỉ tính ~6ms, vành nào xong
// thì "hiện ra từ sương" (uReveal 0->1); sau đó tới rừng, rồi bản làng. Không đổ/nhận bóng.
const TAU = Math.PI * 2
const BUDGET_MS = 6

const FAR_SHADE = /* glsl */ `
  uniform vec3 uHaze;
  uniform vec3 uSeaLit;
  uniform vec3 uSeaShade;
  uniform vec3 uSunDir;
  uniform float uSunAmt;
  uniform float uLight;
  uniform float uSeaY;
  uniform float uTime;
  uniform float uReveal;
  float hash12(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
  }
  // CÙNG quy luật sáng tối với phần cảnh lit (directionalLight đặt theo uSunDir): mặt hướng
  // nắng sáng ấm, mặt khuất nắng chỉ nhận ánh trời (xanh lạnh, tối hơn rõ), mặt ngửa lên sáng hơn
  // mặt dựng đứng. Trời mây/mưa (uSunAmt thấp) -> chênh sáng tối dịu đi, đều hơn.
  vec3 farLight(vec3 albedo, vec3 n) {
    vec3 L = normalize(uSunDir);
    float lam = max(dot(n, L), 0.0);
    float wrap = max(dot(n, L) * 0.5 + 0.5, 0.0); // chuyển sáng-tối mềm, không gãy
    float sky = 0.5 + 0.5 * n.y;
    float direct = mix(wrap * 0.55, lam, 0.65) * (0.2 + 0.95 * uSunAmt);
    vec3 fill = vec3(0.72, 0.82, 1.0) * (0.42 + 0.2 * (1.0 - uSunAmt)) * sky;
    vec3 sunC = vec3(1.08, 1.0, 0.88);
    return albedo * uLight * (fill + sunC * direct + 0.06);
  }
  vec3 farAir(vec3 c, vec3 w) {
    float dist = length(w - cameraPosition);
    float hz = pow(smoothstep(60.0, 470.0, dist), 1.15) * 0.88;
    hz = clamp(hz - smoothstep(-20.0, 50.0, w.y) * 0.1, 0.0, 1.0); // lên cao không khí loãng hơn
    c = mix(c, uHaze, hz);
    // SƯƠNG THUNG LŨNG vẽ ngay trên mặt đất (thay mặt phẳng biển mây -> không còn vệt cắt
    // trắng chỗ mặt phẳng xuyên qua núi): dày ở đáy, mép trên lượn theo noise, trôi chậm
    float mn = vnoise(w.xz * 0.025 + vec2(uTime * 0.012, 0.0)) * 0.6 + vnoise(w.xz * 0.07 - uTime * 0.02) * 0.4;
    // màu sương = màu KHÔNG KHÍ xa (uHaze), KHÔNG trắng -> chỉ là đáy thung lũng mờ đi, không thành
    // mảng trắng/xám lạ trên sườn; nhẹ và chỉ ở xa
    float low = 1.0 - smoothstep(uSeaY - 8.0, uSeaY + 1.0 + mn * 5.0, w.y);
    low *= smoothstep(90.0, 200.0, dist);
    c = mix(c, uHaze, low * (0.22 + 0.2 * mn));
    // vừa dựng xong: hiện dần từ màu sương
    return mix(uHaze, c, uReveal);
  }
`
const farUniforms = () => ({ ...skyUniforms, uSeaY: { value: CLOUD_SEA_Y }, uReveal: { value: 0 } })

// ── ĐỊA HÌNH ──────────────────────────────────────────────────────────────────────
const terrainVert = /* glsl */ `
  attribute vec3 aCol;
  attribute float aTer;
  varying vec3 vCol;
  varying float vTer;
  varying vec3 vW;
  varying vec3 vN;
  void main() {
    vCol = aCol;
    vTer = aTer;
    vN = normal;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`
const terrainFrag = /* glsl */ `
  ${FAR_SHADE}
  varying vec3 vCol;
  varying float vTer;
  varying vec3 vW;
  varying vec3 vN;
  void main() {
    vec3 n = normalize(vN);
    // tán rừng nhìn từ xa: lốm đốm sáng/tối (2 tầng noise theo toạ độ thế giới)
    float m = vnoise(vW.xz * 0.45) * 0.6 + vnoise(vW.xz * 1.3 + 17.0) * 0.4;
    vec3 col = vCol * (0.72 + 0.5 * m);
    // ruộng bậc thang: dải lúa theo đường đồng mức, bờ ruộng chỉ hơi sẫm (không kẻ vạch)
    if (vTer > 0.01) {
      float b = fract(vW.y * 0.7);
      float bank = smoothstep(0.0, 0.3, b) * smoothstep(1.0, 0.7, b);
      vec3 paddy = mix(vec3(0.30, 0.37, 0.10), vec3(0.42, 0.47, 0.13), bank);
      col = mix(col, paddy, vTer * 0.85 * smoothstep(0.55, 0.8, n.y));
    }
    vec3 c = farAir(farLight(col, n), vW);
    gl_FragColor = vec4(c, 1.0);
    ${SHADER_OUTRO}
  }
`

const C = (hex: number) => new THREE.Color(hex)
const FOREST_A = C(0x2b4a22)
const FOREST_B = C(0x4d7232)
const MEADOW = C(0x6b8638)
const CLIFF = C(0x67704f) // vách đá vôi phủ rêu (xanh xám SẪM, không xám sáng)
const CLIFF_DARK = C(0x454c38)
const RICE = C(0x93a347)
const VILLAGE = C(0x857f4e)
const NEAR = C(0x667a3c) // hợp tông lưới Ground ở mép nối

/** Chờ khung hình sau (nhường main thread cho render/tương tác). */
const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

function terrainGrid(isMobile: boolean) {
  const NR = isMobile ? 96 : 140
  const NA = isMobile ? 320 : 512
  const ringR = (i: number) => FAR_R0 * Math.pow(FAR_R1 / FAR_R0, i / NR)
  const point = (i: number, j: number, out: THREE.Vector3) => {
    const r = ringR(i)
    const a = (j / NA) * TAU + (i % 2) * (Math.PI / NA) // so le -> tam giác đều hơn
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    let h = farHeight(x, z)
    if (r < GROUND_FADE_R + 1.5) h -= 0.3 // nằm dưới mép lưới Ground, không z-fight
    return out.set(x, h, z)
  }
  return { NR, NA, ringR, point }
}

/**
 * Dựng 1 VÀNH [i0, i1] của lưới, chia nhỏ theo thời gian. Pháp tuyến tính bằng sai phân trên
 * chính lưới (kể cả 1 hàng ngoài mép) -> hai vành kề nhau có pháp tuyến TRÙNG ở hàng chung,
 * không lộ đường nối sáng/tối.
 */
async function buildBand(
  grid: ReturnType<typeof terrainGrid>,
  i0: number,
  i1: number,
  alive: () => boolean
): Promise<THREE.BufferGeometry | null> {
  const { NR, NA, ringR, point } = grid
  const rows = i1 - i0 + 1
  // độ cao các hàng i0-1 .. i1+1 (thêm 2 hàng đệm để tính pháp tuyến ở mép)
  const lo = Math.max(0, i0 - 1)
  const hi = Math.min(NR, i1 + 1)
  const P: THREE.Vector3[][] = []
  let t = performance.now()
  for (let i = lo; i <= hi; i++) {
    const row: THREE.Vector3[] = []
    for (let j = 0; j < NA; j++) row.push(point(i, j, new THREE.Vector3()))
    P[i - lo] = row
    if (performance.now() - t > BUDGET_MS) {
      await nextFrame()
      if (!alive()) return null
      t = performance.now()
    }
  }
  const at = (i: number, j: number) => P[Math.min(hi, Math.max(lo, i)) - lo][((j % NA) + NA) % NA]

  const pos = new Float32Array(rows * NA * 3)
  const nor = new Float32Array(rows * NA * 3)
  const col = new Float32Array(rows * NA * 3)
  const ter = new Float32Array(rows * NA)
  const ta = new THREE.Vector3()
  const tr = new THREE.Vector3()
  const n = new THREE.Vector3()
  const c = new THREE.Color()
  const rock = new THREE.Color()
  for (let i = i0; i <= i1; i++) {
    const r = ringR(i)
    for (let j = 0; j < NA; j++) {
      const p = at(i, j)
      const k = (i - i0) * NA + j
      ta.subVectors(at(i, j + 1), at(i, j - 1))
      tr.subVectors(at(i + 1, j), at(i - 1, j))
      n.crossVectors(ta, tr).normalize()
      if (n.y < 0) n.negate()
      pos.set([p.x, p.y, p.z], k * 3)
      nor.set([n.x, n.y, n.z], k * 3)
      const { x, y, z } = p
      const ny = n.y
      // rừng loang 2 sắc + trảng cỏ chỗ thoải
      c.copy(FOREST_A).lerp(FOREST_B, fbm(x / 22, z / 22, 3, 3))
      const open = fbm(x / 45 + 7, z / 45, 2, 4)
      if (ny > 0.88 && open > 0.58) c.lerp(MEADOW, Math.min(1, (open - 0.58) * 5))
      if (y < VALLEY + 5 && ny > 0.9) c.lerp(RICE, 0.75) // đáy thung lũng: đồng lúa
      // chỉ vách gần dựng đứng mới lộ đá, loang lổ (cây rừng bám vách như Tràng An)
      const cliff =
        THREE.MathUtils.smoothstep(0.3 - ny, 0.0, 0.2) *
        THREE.MathUtils.smoothstep(vnoise(x * 0.11, z * 0.11, 21), 0.35, 0.8) *
        0.55
      if (cliff > 0) {
        const streak = vnoise((x + z) * 0.32, y * 0.06, 8)
        c.lerp(rock.copy(CLIFF).lerp(CLIFF_DARK, streak * 0.8), cliff)
      }
      for (const hm of HAMLETS) if (Math.hypot(x - hm.x, z - hm.z) < hm.rad * 0.85) c.lerp(VILLAGE, 0.6)
      // mép nối với lưới Ground: về tông cỏ sườn đỉnh
      c.lerp(NEAR, 1 - THREE.MathUtils.smoothstep(r, GROUND_FADE_R, GROUND_FADE_R + 14))
      col.set([c.r, c.g, c.b], k * 3)
      ter[k] = terraceMask(x, z)
    }
    if (performance.now() - t > BUDGET_MS) {
      await nextFrame()
      if (!alive()) return null
      t = performance.now()
    }
  }
  const idx: number[] = []
  for (let i = 0; i < rows - 1; i++)
    for (let j = 0; j < NA; j++) {
      const a = i * NA + j
      const b = i * NA + ((j + 1) % NA)
      const cc = (i + 1) * NA + j
      const d = (i + 1) * NA + ((j + 1) % NA)
      // thứ tự CÙNG chiều kim đồng hồ khi nhìn từ trên xuống (trục z lật) -> mặt trước hướng LÊN.
      // (a, cc, b) làm mặt trước úp xuống: nhìn từ đỉnh bị cull hết, chỉ thấy "mặt trong" của núi
      // -> các mảng xám nhọn lơ lửng khó hiểu.
      idx.push(a, b, cc, b, d, cc)
    }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  g.setAttribute('aCol', new THREE.BufferAttribute(col, 3))
  g.setAttribute('aTer', new THREE.BufferAttribute(ter, 1))
  g.setIndex(idx)
  g.computeBoundingSphere()
  return g
}

// ── RỪNG CÂY + NHÀ (instanced) ───────────────────────────────────────────────────
const instVert = /* glsl */ `
  attribute vec3 aCol;
  attribute float aKind; // 0 thường, 1 mái (nhuộm theo aTint), 2 cửa sổ (sáng về đêm)
  attribute vec3 aTint;
  varying vec3 vCol;
  varying float vKind;
  varying vec3 vW;
  varying vec3 vN;
  void main() {
    vCol = aKind > 0.5 && aKind < 1.5 ? aTint : aCol * aTint;
    vKind = aKind;
    vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`
const instFrag = /* glsl */ `
  ${FAR_SHADE}
  uniform float uNight;
  varying vec3 vCol;
  varying float vKind;
  varying vec3 vW;
  varying vec3 vN;
  void main() {
    vec3 c = farLight(vCol, normalize(vN));
    if (vKind > 1.5) c = mix(c, vec3(1.6, 0.95, 0.45), uNight); // đèn nhà về đêm
    c = farAir(c, vW);
    gl_FragColor = vec4(c, 1.0);
    ${SHADER_OUTRO}
  }
`

/** Gộp các mảnh (geometry + màu + loại) thành 1 geometry non-indexed. */
function mergeParts(
  parts: {
    g: THREE.BufferGeometry
    color: number
    kind?: number
    round?: THREE.Vector3
    shade?: (x: number, y: number, z: number) => number // nhân sáng theo đỉnh (bóng trong tán)
  }[]
) {
  const pos: number[] = []
  const nor: number[] = []
  const col: number[] = []
  const kind: number[] = []
  const c = new THREE.Color()
  const rn = new THREE.Vector3()
  for (const p of parts) {
    const g = p.g.index ? p.g.toNonIndexed() : p.g
    g.computeVertexNormals()
    const pa = g.attributes.position as THREE.BufferAttribute
    const na = g.attributes.normal as THREE.BufferAttribute
    c.setHex(p.color)
    for (let i = 0; i < pa.count; i++) {
      pos.push(pa.getX(i), pa.getY(i), pa.getZ(i))
      if (p.round) {
        // pháp tuyến TOẢ TRÒN từ tâm tán -> tán cây tròn mượt, không lộ mặt phẳng góc cạnh
        rn.set(pa.getX(i), pa.getY(i), pa.getZ(i)).sub(p.round).normalize()
        nor.push(rn.x, rn.y, rn.z)
      } else nor.push(na.getX(i), na.getY(i), na.getZ(i))
      const k = p.shade ? p.shade(pa.getX(i), pa.getY(i), pa.getZ(i)) : 1
      col.push(c.r * k, c.g * k, c.b * k)
      kind.push(p.kind ?? 0)
    }
    if (g !== p.g) g.dispose()
    p.g.dispose()
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  out.setAttribute('aCol', new THREE.Float32BufferAttribute(col, 3))
  out.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1))
  return out
}

// TÁN XÙ XÌ: ghép từ nhiều CỤM LÁ (icosa thô, đỉnh bị đẩy ra/vào ngẫu nhiên) to nhỏ khác nhau ->
// đường viền lồi lõm như mây, không còn quả cầu tròn. Pháp tuyến toả từ tâm TỪNG cụm (mỗi cụm có
// mặt sáng/mặt tối riêng) + bóng trong tán (đáy & khe giữa các cụm tối hơn). ~80 tam giác/cây.
// 3 DÁNG: 0 tán tròn lá rộng · 1 cao thon · 2 xoè thấp (kiểu đa/si).
type Clump = [x: number, y: number, z: number, r: number]
const TREE_FORMS: { trunkH: number; clumps: Clump[] }[] = [
  {
    trunkH: 1.1,
    clumps: [
      [0, 1.5, 0, 0.78],
      [0.52, 1.25, 0.2, 0.55],
      [-0.45, 1.3, -0.3, 0.58],
      [0.08, 2.05, -0.12, 0.5],
    ],
  },
  {
    trunkH: 1.3,
    clumps: [
      [0, 1.45, 0, 0.6],
      [0.18, 1.95, 0.12, 0.5],
      [-0.12, 2.4, -0.05, 0.38],
      [0.3, 1.35, -0.28, 0.4],
    ],
  },
  {
    trunkH: 0.95,
    clumps: [
      [0, 1.4, 0, 0.62],
      [0.78, 1.25, 0.15, 0.55],
      [-0.75, 1.3, -0.1, 0.56],
      [0.1, 1.35, 0.7, 0.5],
    ],
  },
]

function jitterHash(x: number, y: number, z: number, seed: number) {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 19.3) * 43758.5453
  return h - Math.floor(h)
}

function makeFarTree(form: number) {
  const F = TREE_FORMS[form]
  const trunk = new THREE.CylinderGeometry(0.1, 0.17, F.trunkH, 4, 1, true)
  trunk.translate(0, F.trunkH / 2, 0)
  // tâm khối tán (để tính bóng trong lõi)
  let cy = 0
  for (const c of F.clumps) cy += c[1] / F.clumps.length
  const parts: Parameters<typeof mergeParts>[0] = [{ g: trunk, color: 0x4a3622 }]
  // + CHÙM LÁ NHỎ lú ra khỏi viền tán (bát diện 8 tam giác — rẻ) -> mép tán lởm chởm nhiều tầng
  let cx = 0
  let cz = 0
  let ext = 0
  for (const c of F.clumps) {
    cx += c[0] / F.clumps.length
    cz += c[2] / F.clumps.length
  }
  for (const c of F.clumps) ext = Math.max(ext, Math.hypot(c[0] - cx, c[1] - cy, c[2] - cz) + c[3] * 0.85)
  const rnd = mulberry32(0x7ee + form * 101)
  const sprigs: Clump[] = []
  for (let i = 0; i < 7; i++) {
    // hướng ngẫu nhiên, thiên về ngang/lên (đáy tán ít chùm lú ra)
    const a = (i / 7) * TAU + rnd() * 0.7
    const el = -0.25 + rnd() * 1.05
    const d = ext * (0.82 + rnd() * 0.15)
    sprigs.push([
      cx + Math.cos(a) * Math.cos(el) * d,
      cy + Math.sin(el) * d * 0.9,
      cz + Math.sin(a) * Math.cos(el) * d,
      0.2 + rnd() * 0.14,
    ])
  }
  const all = [...F.clumps.map((c) => [c, false] as const), ...sprigs.map((c) => [c, true] as const)]
  all.forEach(([[x, y, z, r], small], ci) => {
    const g = small ? new THREE.OctahedronGeometry(1, 0) : new THREE.IcosahedronGeometry(1, 0)
    const pa = g.attributes.position as THREE.BufferAttribute
    // đẩy từng đỉnh ra/vào (theo hash vị trí -> đỉnh dùng chung giữa các mặt vẫn khớp, không hở)
    for (let i = 0; i < pa.count; i++) {
      const vx = pa.getX(i)
      const vy = pa.getY(i)
      const vz = pa.getZ(i)
      const k = 0.6 + jitterHash(vx, vy, vz, form * 7 + ci) * 0.75
      pa.setXYZ(i, vx * k * r, vy * k * r * 0.88, vz * k * r)
    }
    g.rotateY(ci * 1.3 + form)
    if (small) g.rotateX(ci * 0.9)
    g.translate(x, y, z)
    parts.push({
      g,
      color: 0xffffff,
      round: new THREE.Vector3(x, y - r * 0.25, z),
      shade: (px, py, pz) => {
        // đáy cụm & phía úp vào lõi tán tối hơn (ambient occlusion "nướng" sẵn)
        const under = THREE.MathUtils.clamp((py - (y - r)) / (2 * r), 0, 1)
        const out = Math.hypot(px, pz) / 0.9 + (py - cy) * 0.6
        return 0.55 + 0.3 * under + 0.2 * THREE.MathUtils.clamp(out, 0, 1)
      },
    })
  })
  return mergeParts(parts)
}

// Nhà mái ngói nhỏ: thân + mái 4 mái (nhuộm theo aTint) + ô cửa (sáng về đêm)
function makeFarHouse() {
  const body = new THREE.BoxGeometry(2.6, 1.5, 1.9)
  body.translate(0, 0.75, 0)
  const roof = new THREE.ConeGeometry(2.15, 1.35, 4, 1)
  roof.rotateY(Math.PI / 4)
  roof.scale(1.15, 1, 0.85)
  roof.translate(0, 2.15, 0)
  const win = new THREE.BoxGeometry(0.9, 0.55, 0.06)
  win.translate(0.3, 0.85, 0.97)
  return mergeParts([
    { g: body, color: 0xd9c9a3 },
    { g: roof, color: 0xffffff, kind: 1 },
    { g: win, color: 0x3a2a1c, kind: 2 },
  ])
}

const TREE_TINTS = [0x2c5222, 0x3a6527, 0x4b742c, 0x284a28, 0x557a30, 0x33603a, 0x667f2e]
const ROOF_TINTS = [0x7a3a26, 0x8a4a2c, 0x5e3424, 0x8c6a3e, 0x6e4a2e]

type Inst = { x: number; y: number; z: number; s: number; sy: number; yaw: number; tint: number; form?: number }

async function placeTrees(isMobile: boolean, alive: () => boolean): Promise<Inst[] | null> {
  const N = isMobile ? 2200 : 7000
  const rng = mulberry32(0xf0e57 + N)
  const out: Inst[] = []
  let t = performance.now()
  for (let k = 0; k < N * 6 && out.length < N; k++) {
    if ((k & 63) === 0 && performance.now() - t > BUDGET_MS) {
      await nextFrame()
      if (!alive()) return null
      t = performance.now()
    }
    // chỉ tới r≈170: xa hơn cây bị sương nhạt khác tông mặt núi -> trông như lơ lửng; tán rừng xa
    // đã có lốm đốm trong shader địa hình
    const r = FAR_R0 + 4 + Math.pow(rng(), 1.2) * 110
    const a = rng() * TAU
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    const h = farHeight(x, z)
    if (h < CLOUD_SEA_Y - 4) continue
    // rừng mọc thành mảng (noise); vách dựng đứng vẫn có cây bám (thưa hơn)
    const forest = fbm(x / 38, z / 38, 3, 77)
    if (forest < 0.36) continue
    const slope = farSlope(x, z, 1.2)
    if (slope > 3 || forest < 0.36 + slope * 0.1) continue
    let inVillage = false
    for (const hm of HAMLETS) if (Math.hypot(x - hm.x, z - hm.z) < hm.rad * 0.9) inVillage = true
    if (inVillage && rng() > 0.06) continue
    // LUẬT GẦN XA: kích thước THẬT như nhau ở mọi khoảng cách (cao ~1,5–2,8m) -> cây xa tự nhỏ
    // dần trên màn hình theo phối cảnh (trước đây phóng to cây xa cho "dễ thấy" -> phá luật gần xa)
    const s = 0.55 + rng() * 0.45
    out.push({
      x,
      y: h - s * 0.3,
      z,
      s,
      sy: 0.85 + rng() * 0.35,
      yaw: rng() * TAU,
      tint: TREE_TINTS[Math.floor(rng() * TREE_TINTS.length)],
      form: rng() < 0.45 ? 0 : rng() < 0.55 ? 1 : 2,
    })
  }
  return out
}

function placeHouses(): Inst[] {
  const rng = mulberry32(0x4a3e1)
  const out: Inst[] = []
  for (const hm of HAMLETS) {
    const want = 9 + Math.floor(rng() * 6)
    const placed: { x: number; z: number }[] = []
    const baseYaw = rng() * TAU
    for (let k = 0; k < 80 && placed.length < want; k++) {
      const a = rng() * TAU
      const d = Math.sqrt(rng()) * hm.rad * 0.72
      const x = hm.x + Math.cos(a) * d
      const z = hm.z + Math.sin(a) * d
      if (placed.some((p) => Math.hypot(p.x - x, p.z - z) < 2.8)) continue
      placed.push({ x, z })
      out.push({
        x,
        y: farHeight(x, z) - 0.1,
        z,
        s: 0.72 + rng() * 0.2,
        sy: 1,
        yaw: baseYaw + Math.round(rng() * 3) * (Math.PI / 2) + (rng() - 0.5) * 0.3,
        tint: ROOF_TINTS[Math.floor(rng() * ROOF_TINTS.length)],
      })
    }
  }
  return out
}

/** Material + hiệu ứng "hiện ra từ sương" (uReveal 0->1 trong ~1,4s) khi mount. */
function useRevealMat(vertexShader: string, fragmentShader: string) {
  const mat = useMemo(
    () => new THREE.ShaderMaterial({ uniforms: farUniforms(), vertexShader, fragmentShader, fog: false }),
    [vertexShader, fragmentShader]
  )
  useFrame((_, dt) => {
    const u = mat.uniforms.uReveal
    if (u.value < 1) u.value = Math.min(1, u.value + dt / 1.4)
  })
  return mat
}

function Band({ geo }: { geo: THREE.BufferGeometry }) {
  const mat = useRevealMat(terrainVert, terrainFrag)
  return <mesh geometry={geo} material={mat} />
}

function Instances({ geo, data }: { geo: THREE.BufferGeometry; data: Inst[] }) {
  const mat = useRevealMat(instVert, instFrag)
  const g = useMemo(() => {
    const tint = new Float32Array(data.length * 3)
    const c = new THREE.Color()
    data.forEach((d, i) => {
      c.setHex(d.tint)
      tint.set([c.r, c.g, c.b], i * 3)
    })
    geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 3))
    return geo
  }, [geo, data])
  const ref = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return
    const o = new THREE.Object3D()
    data.forEach((d, i) => {
      o.position.set(d.x, d.y, d.z)
      o.rotation.set(0, d.yaw, 0)
      o.scale.set(d.s, d.s * d.sy, d.s)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }
  return <instancedMesh ref={ref} args={[g, mat, data.length]} frustumCulled={false} />
}

export default function FarLands() {
  const isMobile = useIsMobile()
  const [bands, setBands] = useState<THREE.BufferGeometry[]>([])
  const [trees, setTrees] = useState<Inst[] | null>(null)
  const [houses, setHouses] = useState<Inst[] | null>(null)
  const treeGeos = useMemo(() => TREE_FORMS.map((_, i) => makeFarTree(i)), [])
  const treesByForm = useMemo(
    () => (trees ? TREE_FORMS.map((_, i) => trees.filter((t) => t.form === i)) : null),
    [trees]
  )
  const houseGeo = useMemo(() => makeFarHouse(), [])

  // Dựng dần sau khi cảnh đã hiện: vành gần trước (thấy ngay sau lưng cây), xa sau.
  useEffect(() => {
    let live = true
    const alive = () => live
    const built: THREE.BufferGeometry[] = []
    ;(async () => {
      await nextFrame()
      const grid = terrainGrid(isMobile)
      const cuts = [0.3, 0.52, 0.76, 1].map((f) => Math.round(grid.NR * f))
      let i0 = 0
      for (const i1 of cuts) {
        const g = await buildBand(grid, i0, i1, alive)
        if (!g) return
        built.push(g)
        setBands((b) => [...b, g])
        i0 = i1
      }
      const tr = await placeTrees(isMobile, alive)
      if (!tr) return
      setTrees(tr)
      await nextFrame()
      if (live) setHouses(placeHouses())
    })()
    return () => {
      live = false
      built.forEach((g) => g.dispose())
      setBands([])
      setTrees(null)
      setHouses(null)
    }
  }, [isMobile])

  return (
    <group>
      {bands.map((g) => (
        <Band key={g.uuid} geo={g} />
      ))}
      {treesByForm?.map((d, i) => <Instances key={i} geo={treeGeos[i]} data={d} />)}
      {houses && <Instances geo={houseGeo} data={houses} />}
    </group>
  )
}
