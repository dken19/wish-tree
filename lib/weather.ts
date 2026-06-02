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
}

// Cấu hình ánh sáng/fog cho từng điều kiện (port từ applyWeather)
export const PRESETS: Record<Condition, LightPreset> = {
  clear: {
    fog: 0xcfe0f0,
    hemi: { intensity: 0.95, color: 0xffffff, ground: 0x9bbf8f },
    sun: { intensity: 1.15, color: 0xfff0d8 },
    ambient: 0.25,
    rain: false,
  },
  cloud: {
    fog: 0xc8d2da,
    hemi: { intensity: 0.85, color: 0xeaf0f5, ground: 0x9bbf8f },
    sun: { intensity: 0.55, color: 0xfdf4e6 },
    ambient: 0.3,
    rain: false,
  },
  rain: {
    fog: 0x8794a0,
    hemi: { intensity: 0.7, color: 0xc9d4dd, ground: 0x7c8a78 },
    sun: { intensity: 0.45, color: 0xd8e2ea },
    ambient: 0.35,
    rain: true,
  },
  night: {
    fog: 0x223055,
    hemi: { intensity: 0.45, color: 0x9fb8e0, ground: 0x223055 },
    sun: { intensity: 0.35, color: 0x9db4e8 },
    ambient: 0.25,
    rain: false,
  },
}

// Map weather_code của Open-Meteo -> nhóm điều kiện
export function codeToCond(code: number, isDay: boolean | number): Condition {
  if (!isDay) return 'night'
  if (code === 0 || code === 1) return 'clear'
  if (code >= 51) return 'rain'
  return 'cloud'
}

// Quy đổi tốc độ gió (m/s ~ km/h từ Open-Meteo) -> hệ số gió cho hiệu ứng
export function windFromSpeed(speed: number): number {
  return 0.6 + (Math.min(speed || 5, 25) / 25) * 1.2
}

export const HANOI = { lat: 21.0245, lon: 105.8412 }
