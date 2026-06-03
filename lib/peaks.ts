// Định vị các ngọn núi xa (dùng chung giữa Scenery dựng mesh & Monastery đặt trên đỉnh).
// Tách riêng để tránh import vòng giữa Scenery <-> Monastery.
const TAU = Math.PI * 2

export const VALLEY_FLOOR = -32

// Hai vành núi xa. CHÂN RỘNG (base lớn so với height) -> núi đá vôi tròn, KHÔNG
// nhọn như kim. snowAt cao = gần như không có tuyết (núi đá vôi xanh/xám).
export const RINGS = [
  { n: 4, r: 80, rj: 18, h0: 18, hj: 7, base: 26, snowAt: 80 },
  { n: 6, r: 124, rj: 30, h0: 24, hj: 11, base: 34, snowAt: 80 },
]

/**
 * Tâm + đỉnh của một ngọn núi xa (CÙNG công thức với mesh để không lệch).
 * Trả về (x,z = tâm, apexY = đỉnh nón) — dùng để đặt thiền viện trên đỉnh.
 */
export function peakCenter(ri: number, i: number) {
  const ring = RINGS[ri]
  const a = (i / ring.n) * TAU + (i * 2.3 + ri * 1.9) * 0.21
  const r = ring.r + ((Math.sin(i * 53.7 + ri * 11.3) + 1) / 2) * ring.rj
  const height = ring.h0 + ((Math.sin(i * 19.1 + ri) + 1) / 2) * ring.hj
  return {
    x: Math.cos(a) * r,
    z: Math.sin(a) * r,
    apexY: VALLEY_FLOOR + height, // đỉnh nón = baseY + height/2
    height,
  }
}
