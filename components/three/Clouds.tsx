'use client'
import { useMemo } from 'react'
import * as THREE from 'three'
import { mulberry32 } from '@/lib/tree'
import { SHADER_OUTRO, skyUniforms } from '@/lib/skyPalette'
import { useIsMobile } from './useIsMobile'

const TAU = Math.PI * 2

// ── MÂY TÍCH (cumulus) ───────────────────────────────────────────────────────────
// Atlas 2x2 vẽ bằng canvas 1 lần: mỗi ô là 1 cụm mây (nhiều "búp" tròn, đáy phẳng).
// Kênh R = độ sáng (đỉnh búp sáng, mép/đáy tối), A = độ phủ. Shader pha màu
// uCloudShade -> uCloudLit theo R => mây có khối, đổi sắc theo thời tiết/đêm.
function cumulusAtlas(): THREE.CanvasTexture {
  const W = 512
  const H = 256
  const c = document.createElement('canvas')
  c.width = W * 2
  c.height = H * 2
  const g = c.getContext('2d')!
  const rng = mulberry32(0xc10d)
  for (let v = 0; v < 4; v++) {
    const ox = (v % 2) * W
    const oy = Math.floor(v / 2) * H
    g.save()
    g.beginPath()
    g.rect(ox, oy, W, H)
    g.clip()
    const base = oy + H * 0.78
    // ĐƯỜNG BAO TRÊN gồ ghề (nhiều ngọn nhô lên, không phải 1 vòm tròn) + kéo dẹt ngang
    const ph1 = rng() * TAU
    const ph2 = rng() * TAU
    const ph3 = rng() * TAU
    const top = (u: number) =>
      Math.pow(Math.sin(Math.PI * u), 0.7) *
      (0.55 + 0.25 * Math.sin(u * 8 + ph1) + 0.15 * Math.sin(u * 19 + ph2) + 0.08 * Math.sin(u * 37 + ph3))
    const n = 46 + Math.floor(rng() * 18)
    const puffs: { x: number; y: number; r: number; sx: number; a: number }[] = []
    for (let i = 0; i < n; i++) {
      const u = 0.06 + rng() * 0.88
      const hTop = Math.max(0.08, top(u)) * H * 0.62
      // búp nhỏ-vừa, rải từ đáy tới đường bao (búp lớn ở thân, búp nhỏ ở mép -> mép vụn)
      const k = rng()
      const r = H * (0.05 + 0.11 * Math.sin(Math.PI * u) * (0.5 + rng()))
      puffs.push({
        x: ox + u * W + (rng() - 0.5) * 18,
        y: base - r * 0.6 - k * Math.max(0, hTop - r),
        r,
        sx: 1.25 + rng() * 0.9, // dẹt ngang
        a: 0.45 + rng() * 0.45,
      })
    }
    // vài sợi mây mỏng lơ thơ hai đầu
    for (let i = 0; i < 6; i++) {
      const side = i % 2 ? 1 : -1
      const u = 0.5 + side * (0.38 + rng() * 0.12)
      const r = H * (0.03 + rng() * 0.04)
      puffs.push({ x: ox + u * W, y: base - r - rng() * H * 0.08, r, sx: 2.5 + rng() * 1.5, a: 0.3 + rng() * 0.25 })
    }
    // GIỮ mọi búp TRỌN trong ô (chừa lề): búp/sợi mây dẹt ngang tràn ra mép ô bị clip -> mây
    // "cụt" thẳng đứng ở hai đầu. Ép tâm vào trong theo nửa bề ngang thật của búp.
    const PAD = 14
    for (const p of puffs) {
      const hw = Math.min(p.r * p.sx, W / 2 - PAD - 2)
      p.sx = hw / p.r
      p.x = Math.min(ox + W - PAD - hw, Math.max(ox + PAD + hw, p.x))
      p.y = Math.max(oy + PAD + p.r, p.y)
    }
    puffs.sort((a, b) => b.y - a.y) // vẽ từ dưới lên: búp trên đè búp dưới
    for (const p of puffs) {
      g.save()
      g.translate(p.x, p.y)
      g.scale(p.sx, 1)
      const grd = g.createRadialGradient(-p.r * 0.2, -p.r * 0.45, p.r * 0.05, 0, 0, p.r)
      grd.addColorStop(0, `rgba(255,255,255,${p.a})`)
      grd.addColorStop(0.55, `rgba(232,232,232,${p.a * 0.85})`)
      grd.addColorStop(1, 'rgba(190,190,190,0)')
      g.fillStyle = grd
      g.beginPath()
      g.arc(0, 0, p.r, 0, TAU)
      g.fill()
      g.restore()
    }
    // đáy mây mờ dần (không cắt cứng)
    g.globalCompositeOperation = 'destination-out'
    const fade = g.createLinearGradient(0, base - H * 0.1, 0, base + H * 0.05)
    fade.addColorStop(0, 'rgba(0,0,0,0)')
    fade.addColorStop(1, 'rgba(0,0,0,1)')
    g.fillStyle = fade
    g.fillRect(ox, base - H * 0.1, W, H * 0.3)
    g.restore()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.NoColorSpace // kênh R là dữ liệu sáng/tối, không phải màu
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  return tex
}

const cloudVert = /* glsl */ `
  attribute vec4 aCloud; // x: ô atlas 0..3, y: độ đậm, z: tốc độ trôi, w: lệch pha
  uniform float uTime;
  varying vec2 vUv;
  varying float vAlpha;
  varying float vLow;
  varying float vSeed;
  varying vec2 vLocal;
  void main() {
    vLocal = uv;
    vSeed = aCloud.w;
    float cell = aCloud.x;
    vUv = (uv + vec2(mod(cell, 2.0), floor(cell / 2.0))) * 0.5;
    vec3 c = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    float sx = length(instanceMatrix[0].xyz);
    float sy = length(instanceMatrix[1].xyz);
    // trôi theo phương vị quanh đỉnh núi (vòng tròn) -> không bao giờ "bật" về chỗ cũ
    float ang = uTime * aCloud.z;
    float cs = cos(ang), sn = sin(ang);
    c.xz = mat2(cs, -sn, sn, cs) * c.xz;
    vec4 mv = modelViewMatrix * vec4(c, 1.0);
    mv.xy += position.xy * vec2(sx, sy);
    gl_Position = projectionMatrix * mv;
    vAlpha = aCloud.y;
    vLow = uv.y;
  }
`
const cloudFrag = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime;
  varying float vSeed;
  float hash12(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
  }
  uniform vec3 uCloudLit;
  uniform vec3 uCloudShade;
  uniform vec3 uHorizon;
  varying vec2 vUv;
  varying float vAlpha;
  varying float vLow;
  varying vec2 vLocal;
  void main() {
    vec4 t = texture2D(uMap, vUv);
    // mép mây "vụn" theo noise (trôi chậm) -> không tròn vo, không viền cứng
    vec2 q = vUv * vec2(26.0, 13.0) + vSeed * 40.0 + vec2(uTime * 0.03, 0.0);
    float n = vnoise(q) * 0.6 + vnoise(q * 2.3 + 5.0) * 0.4;
    // CHỈ gặm bớt (nhân), không bao giờ cộng thêm: chỗ texture trống (a=0) phải trong suốt hoàn
    // toàn — trước đây phép trừ noise làm cả tấm billboard hiện thành mảng xám có cạnh thẳng
    float a = smoothstep(0.1, 0.55, t.a * (0.45 + 0.9 * n)) * vAlpha;
    // lưới an toàn: mờ dần sát mép tấm billboard (mipmap có thể lấn sang ô atlas bên cạnh)
    a *= smoothstep(0.0, 0.06, vLocal.x) * smoothstep(1.0, 0.94, vLocal.x) * smoothstep(1.0, 0.94, vLocal.y);
    if (a < 0.01) discard;
    float lit = clamp(t.r * (0.72 + 0.28 * vLow), 0.0, 1.0);
    vec3 col = mix(uCloudShade, uCloudLit * 1.12, smoothstep(0.35, 0.92, lit));
    col = mix(col, uHorizon, 0.1); // ám chút không khí
    gl_FragColor = vec4(col, a);
    ${SHADER_OUTRO}
  }
`

function CumulusClouds() {
  const isMobile = useIsMobile()
  const N = isMobile ? 12 : 22
  const tex = useMemo(() => cumulusAtlas(), [])

  const { geo, mat } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1, 1)
    geo.translate(0, 0.5, 0) // gốc ở đáy mây
    const rng = mulberry32(0xa11 + N)
    const data = new Float32Array(N * 4)
    for (let i = 0; i < N; i++) {
      data.set([Math.floor(rng() * 4), 0.75 + rng() * 0.25, (rng() < 0.5 ? 1 : -1) * (0.004 + rng() * 0.004), rng()], i * 4)
    }
    geo.setAttribute('aCloud', new THREE.InstancedBufferAttribute(data, 4))
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: tex },
        uTime: skyUniforms.uTime,
        uCloudLit: skyUniforms.uCloudLit,
        uCloudShade: skyUniforms.uCloudShade,
        uHorizon: skyUniforms.uHorizon,
      },
      vertexShader: cloudVert,
      fragmentShader: cloudFrag,
      transparent: true,
      depthWrite: false,
      fog: false,
    })
    return { geo, mat }
  }, [N, tex])

  const ref = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return
    const rng = mulberry32(0x5e7 + N)
    const dummy = new THREE.Object3D()
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU + rng() * 0.5
      const r = 210 + rng() * 90
      // đáy mây cao 34..80 -> LUÔN nằm TRÊN đường chân trời núi (tháp xa cao tới ~+35), không lọt
      // vào giữa các dãy núi thành mảng trắng
      const y = 34 + Math.pow(rng(), 1.3) * 46
      const w = 34 + rng() * 40
      dummy.position.set(Math.cos(a) * r, y, Math.sin(a) * r)
      dummy.scale.set(w, w * (0.42 + rng() * 0.16), 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }

  return <instancedMesh ref={ref} args={[geo, mat, N]} frustumCulled={false} renderOrder={-5} />
}

// (Biển mây dạng mặt phẳng đã bỏ: mặt phẳng cắt qua núi để lại vệt trắng. Sương thung lũng giờ
// vẽ ngay trong shader địa hình xa — FarLands/farAir.)

export default function Clouds() {
  return (
    <group>
      <CumulusClouds />
    </group>
  )
}
