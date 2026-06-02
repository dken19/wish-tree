// Chủ đề điều ước (port từ prototype). Mỗi theme = một "zone" treo trên cây.

export type ThemeKey =
  | 'thi'
  | 'diem'
  | 'yeu'
  | 'nha'
  | 'khoe'
  | 'mo'
  | 'ban'
  | 'tam'

export type Theme = { label: string; color: string }

export const THEMES: Record<ThemeKey, Theme> = {
  thi: { label: 'Thi cử', color: '#d6243a' },
  diem: { label: 'Điểm số', color: '#e0792b' },
  yeu: { label: 'Tình học trò', color: '#d6457a' },
  nha: { label: 'Gia đình', color: '#c79a2e' },
  khoe: { label: 'Sức khỏe', color: '#3f9d6b' },
  mo: { label: 'Ước mơ', color: '#6b6cc2' },
  ban: { label: 'Tình bạn', color: '#2f9bb8' },
  tam: { label: 'Tâm sự', color: '#8a6f9e' },
}

export const THEME_KEYS = Object.keys(THEMES) as ThemeKey[]

export function isThemeKey(v: unknown): v is ThemeKey {
  return typeof v === 'string' && v in THEMES
}
