// Mốc trời theo GIỜ VIỆT NAM (UTC+7, không phụ thuộc múi giờ máy người xem) cho nền đèn trời
// của các trang nội dung (/dieu-uoc, /ky-nang, giới thiệu, pháp lý).

export type SkyPhase = 'dawn' | 'day' | 'dusk' | 'night'

export const SKY_LABEL: Record<SkyPhase, string> = {
  dawn: 'bình minh',
  day: 'ban trưa',
  dusk: 'hoàng hôn',
  night: 'đêm',
}

/** Giờ thập phân ở Việt Nam, vd 17.5 = 17:30. */
export function vnHours(ms = Date.now()): number {
  return ((ms / 3_600_000 + 7) % 24 + 24) % 24
}

/** 5h–7h bình minh · 7h–16h30 trưa · 16h30–18h45 hoàng hôn · còn lại đêm. */
export function skyPhase(ms = Date.now()): SkyPhase {
  const h = vnHours(ms)
  if (h >= 5 && h < 7) return 'dawn'
  if (h >= 7 && h < 16.5) return 'day'
  if (h >= 16.5 && h < 18.75) return 'dusk'
  return 'night'
}

/** "17:42" giờ Việt Nam. */
export function vnClock(ms = Date.now()): string {
  const h = vnHours(ms)
  const hh = Math.floor(h)
  const mm = Math.floor((h - hh) * 60)
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

const isPhase = (v: unknown): v is SkyPhase =>
  v === 'dawn' || v === 'day' || v === 'dusk' || v === 'night'

/** `?sky=dusk` để xem thử một mốc (QA / chụp màn hình); không có thì theo giờ thật. */
export function phaseFromUrl(): SkyPhase | null {
  if (typeof window === 'undefined') return null
  const p = new URLSearchParams(window.location.search).get('sky')
  return isPhase(p) ? p : null
}

/**
 * Script chạy TRƯỚC khi vẽ (nhúng ở <head> trong app/layout) -> đặt `<html data-sky>` ngay,
 * không nháy từ trời trưa sang đêm lúc hydrate. Logic phải KHỚP skyPhase() ở trên.
 */
export const SKY_INIT_SCRIPT = `(function(){try{var q=new URLSearchParams(location.search).get('sky');var h=((Date.now()/36e5+7)%24+24)%24;var p=/^(dawn|day|dusk|night)$/.test(q||'')?q:h>=5&&h<7?'dawn':h>=7&&h<16.5?'day':h>=16.5&&h<18.75?'dusk':'night';document.documentElement.setAttribute('data-sky',p)}catch(e){}})()`
