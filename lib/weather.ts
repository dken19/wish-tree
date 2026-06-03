// Logic thời tiết thuần dữ liệu (port từ prototype).

export type Condition = 'clear' | 'cloud' | 'rain' | 'night'

export const SKIES: Record<Condition, string> = {
  clear: 'linear-gradient(180deg,#7fb4f0 0%,#aed4f5 45%,#fbe4cf 100%)',
  cloud: 'linear-gradient(180deg,#9fb0bd 0%,#c2ced8 55%,#e2e8ed 100%)',
  rain: 'linear-gradient(180deg,#5d6b78 0%,#7d8b97 55%,#9aa6b0 100%)',
  night: 'linear-gradient(180deg,#0c1330 0%,#1d2a52 55%,#3a3a63 100%)',
}

export const WX_ICON: Record<Condition, string> = {
  clear: '☀️',
  cloud: '☁️',
  rain: '🌧️',
  night: '🌙',
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
    hemi: { intensity: 0.6, color: 0xddeeff, ground: 0x6b8f4f },
    sun: { intensity: 2.4, color: 0xfff2dc },
    ambient: 0.18,
    rain: false,
    sky: { elevation: 26, azimuth: 135, turbidity: 5, rayleigh: 1.3, exposure: 1.0 },
  },
  cloud: {
    fog: 0xc8d2da,
    hemi: { intensity: 0.7, color: 0xeaf0f5, ground: 0x70875c },
    sun: { intensity: 1.1, color: 0xfdf4e6 },
    ambient: 0.28,
    rain: false,
    sky: { elevation: 34, azimuth: 130, turbidity: 11, rayleigh: 2.4, exposure: 0.92 },
  },
  rain: {
    fog: 0x8794a0,
    hemi: { intensity: 0.6, color: 0xc9d4dd, ground: 0x67746a },
    sun: { intensity: 0.7, color: 0xd8e2ea },
    ambient: 0.32,
    rain: true,
    sky: { elevation: 22, azimuth: 120, turbidity: 14, rayleigh: 3.2, exposure: 0.7 },
  },
  night: {
    fog: 0x223055,
    hemi: { intensity: 0.35, color: 0x9fb8e0, ground: 0x1a2440 },
    sun: { intensity: 0.5, color: 0x9db4e8 },
    ambient: 0.16,
    rain: false,
    sky: { elevation: -4, azimuth: 110, turbidity: 3, rayleigh: 0.8, exposure: 0.5 },
  },
}

// Map weather_code của Open-Meteo -> nhóm điều kiện (giữ cho tương thích cũ)
export function codeToCond(code: number, isDay: boolean | number): Condition {
  if (!isDay) return 'night'
  if (code === 0 || code === 1) return 'clear'
  if (code >= 51) return 'rain'
  return 'cloud'
}

// Điều kiện THỰC TẾ: ưu tiên lượng mưa đang rơi + độ mây, BỎ QUA weather_code
// (mã 95 "giông" gây hiểu nhầm: trời 0mm mưa vẫn báo Mưa). Ban đêm -> 'night'.
export function condFromCurrent(opts: {
  precipitation: number
  cloudCover: number
  isDay: boolean | number
}): Condition {
  if (!opts.isDay) return 'night'
  if (opts.precipitation >= 0.15) return 'rain' // chỉ Mưa khi thực sự có mưa
  if (opts.cloudCover >= 65) return 'cloud'
  return 'clear'
}

// Quy đổi tốc độ gió (m/s ~ km/h từ Open-Meteo) -> hệ số gió cho hiệu ứng
export function windFromSpeed(speed: number): number {
  return 0.6 + (Math.min(speed || 5, 25) / 25) * 1.2
}

export const HANOI = { lat: 21.0245, lon: 105.8412 }
