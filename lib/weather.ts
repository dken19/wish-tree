// Logic thời tiết thuần dữ liệu (port từ prototype).

export type Condition = 'clear' | 'cloud' | 'rain' | 'night'

export const SKIES: Record<Condition, string> = {
  clear: 'linear-gradient(180deg,#7fb4f0 0%,#aed4f5 45%,#fbe4cf 100%)',
  cloud: 'linear-gradient(180deg,#9fb0bd 0%,#c2ced8 55%,#e2e8ed 100%)',
  rain: 'linear-gradient(180deg,#5d6b78 0%,#7d8b97 55%,#9aa6b0 100%)',
  night: 'linear-gradient(180deg,#0c1330 0%,#1d2a52 55%,#3a3a63 100%)',
}

export const WX_VI: Record<Condition, string> = {
  clear: 'Nắng',
  cloud: 'Nhiều mây',
  rain: 'Mưa',
  night: 'Đêm',
}

export type LightPreset = {
  fog: number
  hemi: { intensity: number; color: number; ground: number }
  sun: { intensity: number; color: number }
  ambient: number
  rain: boolean
  // bầu trời tả thực (drei Sky) + phơi sáng tone-mapping
  sky: {
    elevation: number // độ cao mặt trời (độ); <0 -> trời tối
    azimuth: number // phương vị (độ)
    turbidity: number
    rayleigh: number
    exposure: number
  }
}

// Cấu hình ánh sáng/fog cho từng điều kiện (port từ applyWeather)
export const PRESETS: Record<Condition, LightPreset> = {
  clear: {
    fog: 0xcfe0f0,
    hemi: { intensity: 0.95, color: 0xddeeff, ground: 0x7a9c5c },
    sun: { intensity: 2.5, color: 0xfff2dc },
    ambient: 0.26,
    rain: false,
    sky: { elevation: 26, azimuth: 135, turbidity: 5, rayleigh: 1.3, exposure: 1.0 },
  },
  cloud: {
    fog: 0xc8d2da,
    hemi: { intensity: 1.05, color: 0xeaf0f5, ground: 0x7a9166 },
    sun: { intensity: 1.3, color: 0xfdf4e6 },
    ambient: 0.36,
    rain: false,
    sky: { elevation: 34, azimuth: 130, turbidity: 11, rayleigh: 2.4, exposure: 0.92 },
  },
  rain: {
    fog: 0x8794a0,
    hemi: { intensity: 0.95, color: 0xc9d4dd, ground: 0x6f7d72 },
    sun: { intensity: 0.85, color: 0xd8e2ea },
    ambient: 0.4,
    rain: true,
    sky: { elevation: 22, azimuth: 120, turbidity: 14, rayleigh: 3.2, exposure: 0.82 },
  },
  night: {
    fog: 0x223055,
    hemi: { intensity: 0.75, color: 0xa9c0e6, ground: 0x2c3a5a },
    sun: { intensity: 0.6, color: 0x9db4e8 },
    ambient: 0.3,
    rain: false,
    sky: { elevation: -4, azimuth: 110, turbidity: 3, rayleigh: 0.8, exposure: 0.7 },
  },
}

// Thời tiết trên cây: NGÀY/ĐÊM theo giờ Việt Nam (skyPhase), nắng/mây/mưa RANDOM
// (không gọi API thời tiết, không có nút chuyển). Mưa hiếm hơn để cảnh đa phần sáng sủa.
export function randomDayWeather(r = Math.random()): Exclude<Condition, 'night'> {
  if (r < 0.55) return 'clear'
  if (r < 0.82) return 'cloud'
  return 'rain'
}

/** Hệ số gió ngẫu nhiên 0.7–1.6 (mưa thì gió mạnh hơn). */
export function randomWind(cond: Condition, r = Math.random()): number {
  return (cond === 'rain' ? 1.1 : 0.7) + r * 0.5
}
