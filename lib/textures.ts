// Texture PBR sinh thủ tục (canvas) cho phong cách tả thực: vỏ cây, lá sồi, cỏ.
// Tự sinh nên không cần asset ngoài; kèm normal map để bắt sáng có chiều sâu.
import * as THREE from 'three'

// ---- Value noise tileable (hash grid + nội suy) + fBm ----
function hash(ix: number, iy: number, seed: number): number {
  let h = (ix * 374761393 + iy * 668265263 + seed * 144665) >>> 0
  h = (h ^ (h >>> 13)) >>> 0
  h = Math.imul(h, 1274126177) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}
function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}
// noise tuần hoàn theo `period` -> texture lặp liền mạch
function noise2D(x: number, y: number, period: number, seed: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = smooth(x - x0)
  const fy = smooth(y - y0)
  const wrap = (n: number) => ((n % period) + period) % period
  const a = hash(wrap(x0), wrap(y0), seed)
  const b = hash(wrap(x0 + 1), wrap(y0), seed)
  const c = hash(wrap(x0), wrap(y0 + 1), seed)
  const d = hash(wrap(x0 + 1), wrap(y0 + 1), seed)
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(a, b, fx),
    THREE.MathUtils.lerp(c, d, fx),
    fy
  )
}
function fbm(
  x: number,
  y: number,
  basePeriod: number,
  seed: number,
  oct = 4
): number {
  let amp = 0.5
  let freq = 1
  let sum = 0
  let norm = 0
  for (let o = 0; o < oct; o++) {
    sum += amp * noise2D(x * freq, y * freq, basePeriod * freq, seed + o * 17)
    norm += amp
    amp *= 0.5
    freq *= 2
  }
  return sum / norm
}

// Đổi height-field (hàm trả [0..1]) thành normal map texture (tileable).
function heightToNormal(
  S: number,
  height: (x: number, y: number) => number,
  strength: number
): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  const img = g.createImageData(S, S)
  const wrap = (n: number) => (n + S) % S
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const hL = height(wrap(x - 1), y)
      const hR = height(wrap(x + 1), y)
      const hD = height(x, wrap(y - 1))
      const hU = height(x, wrap(y + 1))
      let nx = (hL - hR) * strength
      let ny = (hD - hU) * strength
      let nz = 1
      const inv = 1 / Math.hypot(nx, ny, nz)
      nx *= inv
      ny *= inv
      nz *= inv
      const i = (y * S + x) * 4
      img.data[i] = (nx * 0.5 + 0.5) * 255
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255
      img.data[i + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

function mixHex(a: number, b: number, t: number): [number, number, number] {
  const ar = (a >> 16) & 255
  const ag = (a >> 8) & 255
  const ab = a & 255
  const br = (b >> 16) & 255
  const bg = (b >> 8) & 255
  const bb = b & 255
  return [ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]
}

// ---------------- Vỏ cây sồi: sớ dọc + rãnh nứt ----------------
export function makeBark(): { map: THREE.CanvasTexture; normal: THREE.CanvasTexture } {
  const S = 512
  const P = 8
  // height: kéo dãn theo trục dọc (y nén) -> sớ chạy dọc thân
  const h = (x: number, y: number) => {
    const fiber = fbm(x / S * P, y / S * P * 0.25, P, 11) // sớ dọc
    const ridge = Math.abs(Math.sin(x / S * Math.PI * P + fiber * 3)) // gờ dọc
    const grain = fbm(x / S * P * 4, y / S * P * 4, P * 4, 23) * 0.25
    return THREE.MathUtils.clamp(ridge * 0.6 + fiber * 0.3 + grain, 0, 1)
  }
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  const img = g.createImageData(S, S)
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const v = h(x, y)
      const [r, gg, b] = mixHex(0x3a2a1c, 0x7d5a38, v) // nâu tối -> nâu sáng
      const i = (y * S + x) * 4
      img.data[i] = r
      img.data[i + 1] = gg
      img.data[i + 2] = b
      img.data[i + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)
  const map = new THREE.CanvasTexture(c)
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  map.colorSpace = THREE.SRGBColorSpace
  const normal = heightToNormal(S, h, 2.2)
  return { map, normal }
}

// ---------------- Cỏ: lốm đốm xanh + sợi mảnh ----------------
export function makeGrass(): { map: THREE.CanvasTexture; normal: THREE.CanvasTexture } {
  const S = 256
  const P = 16
  const h = (x: number, y: number) =>
    fbm(x / S * P, y / S * P, P, 5, 5) * 0.7 + fbm(x / S * P * 3, y / S * P * 3, P * 3, 8) * 0.3
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  const img = g.createImageData(S, S)
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const v = h(x, y)
      const [r, gg, b] = mixHex(0x4a6b32, 0x86a84f, v) // xanh đậm -> xanh sáng
      const i = (y * S + x) * 4
      img.data[i] = r
      img.data[i + 1] = gg
      img.data[i + 2] = b
      img.data[i + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)
  const map = new THREE.CanvasTexture(c)
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  map.colorSpace = THREE.SRGBColorSpace
  const normal = heightToNormal(S, h, 1.4)
  return { map, normal }
}

// ---------------- Cụm lá sồi (alpha card) ----------------
// Vẽ một chùm vài lá sồi có thuỳ -> dùng làm card lá, rải dày thành tán.
export function makeLeafCluster(): THREE.CanvasTexture {
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  g.clearRect(0, 0, S, S)

  const oakLeaf = (cx: number, cy: number, len: number, ang: number, tone: number) => {
    g.save()
    g.translate(cx, cy)
    g.rotate(ang)
    const grd = g.createLinearGradient(0, -len, 0, len)
    const dark = mixHex(0x2f5320, 0x4a7a2c, tone)
    const light = mixHex(0x4a7a2c, 0x86b14e, tone)
    grd.addColorStop(0, `rgb(${light[0] | 0},${light[1] | 0},${light[2] | 0})`)
    grd.addColorStop(1, `rgb(${dark[0] | 0},${dark[1] | 0},${dark[2] | 0})`)
    g.fillStyle = grd
    // thân lá thuỳ: vẽ bằng các cung lượn hai bên
    const w = len * 0.5
    g.beginPath()
    g.moveTo(0, -len)
    const lobes = 4
    for (let s = -1; s <= 1; s += 2) {
      for (let l = 0; l <= lobes; l++) {
        const ty = -len + ((2 * len) / lobes) * l
        const tw = (s * w) * (0.5 + 0.5 * Math.sin((l / lobes) * Math.PI))
        g.quadraticCurveTo(s * w * 1.2, ty - len / lobes / 2, tw, ty)
      }
    }
    g.closePath()
    g.fill()
    // gân giữa
    g.strokeStyle = 'rgba(40,70,30,0.5)'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(0, -len * 0.9)
    g.lineTo(0, len * 0.9)
    g.stroke()
    g.restore()
  }

  // chùm 7 lá quanh tâm
  const leaves = 7
  for (let i = 0; i < leaves; i++) {
    const a = (i / leaves) * Math.PI * 2 + Math.random() * 0.4
    const rr = 18 + Math.random() * 30
    oakLeaf(
      128 + Math.cos(a) * rr,
      128 + Math.sin(a) * rr,
      40 + Math.random() * 26,
      a + Math.PI / 2 + (Math.random() - 0.5) * 0.6,
      Math.random()
    )
  }
  oakLeaf(128, 128, 52, Math.random() * Math.PI, 0.6)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
