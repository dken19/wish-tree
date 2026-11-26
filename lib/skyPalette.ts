// Bảng màu TRỜI / NÚI XA / MÂY theo thời tiết + uniform DÙNG CHUNG cho các shader cảnh xa
// (SkyDome, núi trong Scenery, mây + biển mây trong Clouds). SceneEnv gọi `stepSky` mỗi
// frame -> màu chuyển MƯỢT khi đổi nắng/mây/mưa/đêm, không tạo lại material.
import * as THREE from 'three'
import type { Condition } from './weather'

type Palette = {
  top: number // đỉnh trời
  horizon: number // chân trời (cũng là màu fog -> vật gần hoà vào trời)
  haze: number // màu không khí phủ lên núi xa (phối cảnh khí quyển)
  cloudLit: number // mặt mây được nắng chiếu
  cloudShade: number // bụng mây
  seaLit: number // biển mây quanh đỉnh núi
  seaShade: number
  sunAmt: number // độ rõ quầng mặt trời
  night: number // 0 ngày -> 1 đêm (sao, trăng, núi tối)
  light: number // độ sáng màu núi (đêm tối đi)
}

export const PALETTES: Record<Condition, Palette> = {
  clear: {
    // trời XANH, mây TRẮNG: chân trời xanh nhạt (không trắng loá), đỉnh xanh đậm
    top: 0x1f63c9,
    horizon: 0xa9cdef,
    haze: 0x9cc0e2,
    cloudLit: 0xffffff,
    cloudShade: 0xc2d2e6,
    seaLit: 0xffffff,
    seaShade: 0xc2d3e6,
    sunAmt: 1,
    night: 0,
    light: 1,
  },
  cloud: {
    top: 0x6f88a0,
    horizon: 0xd2dbe3,
    haze: 0xb4c1cd,
    cloudLit: 0xf1f4f7,
    cloudShade: 0x8d9bab,
    seaLit: 0xf0f3f6,
    seaShade: 0xb5c1cc,
    sunAmt: 0.25,
    night: 0,
    light: 0.88,
  },
  rain: {
    top: 0x4a5663,
    horizon: 0x8f9ba6,
    haze: 0x7d8995,
    cloudLit: 0xa3adb7,
    cloudShade: 0x56616d,
    seaLit: 0xaab3bc,
    seaShade: 0x7a8590,
    sunAmt: 0,
    night: 0,
    light: 0.68,
  },
  night: {
    top: 0x040a1f,
    horizon: 0x24315c,
    haze: 0x1f2a50,
    cloudLit: 0x434f78,
    cloudShade: 0x161e3a,
    seaLit: 0x5b6a97,
    seaShade: 0x27335a,
    sunAmt: 0,
    night: 1,
    light: 0.32,
  },
}

const c = (hex: number) => new THREE.Color(hex)
const P0 = PALETTES.clear

/** Uniform dùng chung — truyền THẲNG object này vào `uniforms` của ShaderMaterial. */
export const skyUniforms = {
  uTop: { value: c(P0.top) },
  uHorizon: { value: c(P0.horizon) },
  uHaze: { value: c(P0.haze) },
  uCloudLit: { value: c(P0.cloudLit) },
  uCloudShade: { value: c(P0.cloudShade) },
  uSeaLit: { value: c(P0.seaLit) },
  uSeaShade: { value: c(P0.seaShade) },
  uSunAmt: { value: P0.sunAmt },
  uNight: { value: P0.night },
  uLight: { value: P0.light },
  uSunDir: { value: new THREE.Vector3(0.4, 0.5, 0.7).normalize() },
  uTime: { value: 0 },
}

const tmp = new THREE.Color()
const COLOR_KEYS = [
  ['uTop', 'top'],
  ['uHorizon', 'horizon'],
  ['uHaze', 'haze'],
  ['uCloudLit', 'cloudLit'],
  ['uCloudShade', 'cloudShade'],
  ['uSeaLit', 'seaLit'],
  ['uSeaShade', 'seaShade'],
] as const

/** Đưa uniform dần về bảng màu của `cond` (gọi mỗi frame). `k` = tỉ lệ bám (0..1). */
export function stepSky(cond: Condition, dt: number, k = 1.6) {
  const p = PALETTES[cond]
  const a = 1 - Math.exp(-k * dt)
  for (const [u, key] of COLOR_KEYS) skyUniforms[u].value.lerp(tmp.setHex(p[key]), a)
  skyUniforms.uSunAmt.value += (p.sunAmt - skyUniforms.uSunAmt.value) * a
  skyUniforms.uNight.value += (p.night - skyUniforms.uNight.value) * a
  skyUniforms.uLight.value += (p.light - skyUniforms.uLight.value) * a
  skyUniforms.uTime.value += dt
}

/** Đặt NGAY bảng màu (khung hình đầu, tránh trời ngày loé lên rồi mới tối). */
export function snapSky(cond: Condition) {
  const p = PALETTES[cond]
  for (const [u, key] of COLOR_KEYS) skyUniforms[u].value.setHex(p[key])
  skyUniforms.uSunAmt.value = p.sunAmt
  skyUniforms.uNight.value = p.night
  skyUniforms.uLight.value = p.light
}

/** Ghép tone-mapping + colorspace của three vào cuối fragment shader tự viết. */
export const SHADER_OUTRO = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`
