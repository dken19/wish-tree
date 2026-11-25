// Ghép lá thật (Poly Haven island_tree_02, CC0) thành chùm lá trên cành -> texture card cho tán cây.
// Cách dùng: tải island_tree_02 leaves_diff + leaves_alpha (1k jpg) từ api.polyhaven.com/files/island_tree_02 vào <dir>,
//   node scripts/leafcard.cjs <dir> out_a.webp 7 <dir>  &&  node scripts/leafcard.cjs <dir> out_b.webp 31 <dir>
// rồi ghép 2 ảnh 512 cạnh nhau thành public/scene/leaves.webp (1024×512) bằng sharp composite.
const sharp = require(process.cwd() + '/node_modules/sharp')
const L = process.argv[2] // thư mục chứa ảnh lá
const OUT = process.argv[3]
const BOXES = [[16,24,132,392],[168,24,176,376],[712,24,124,400],[372,36,120,332],[532,52,132,320],[224,596,140,428],[432,620,144,404],[20,644,164,356]]
let seed = Number(process.argv[4] || 7)
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

;(async () => {
  const alpha = await sharp(`${L}/island_tree_02_leaves_alpha_1k.jpg`).greyscale().raw().toBuffer()
  const rgba = await sharp(`${L}/island_tree_02_leaves_diff_1k.jpg`)
    .joinChannel(alpha, { raw: { width: 1024, height: 1024, channels: 1 } })
    .png()
    .toBuffer()
  const leaves = await Promise.all(
    BOXES.map(([l, t, w, h]) => sharp(rgba).extract({ left: l, top: t, width: w, height: h }).png().toBuffer())
  )
  const SZ = 512
  // cành: cong nhẹ từ gốc dưới lên ngọn
  const pts = []
  for (let i = 0; i <= 20; i++) {
    const t = i / 20
    pts.push([SZ / 2 + Math.sin(t * 2.4 + seed) * 18, SZ - 18 - t * (SZ - 110)])
  }
  const at = (t) => {
    const f = t * 20, i = Math.min(19, Math.floor(f)), k = f - i
    return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]
  }
  const twig = `<svg width="${SZ}" height="${SZ}" xmlns="http://www.w3.org/2000/svg"><path d="M${pts.map((p) => p.join(' ')).join(' L')}" stroke="#5a4630" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`
  const comps = [{ input: Buffer.from(twig), left: 0, top: 0 }]
  const N = 11
  for (let k = 0; k < N; k++) {
    const t = 0.1 + (k / (N - 1)) * 0.82
    const side = k % 2 ? 1 : -1
    const top = k === N - 1
    const deg = top ? (rnd() - 0.5) * 14 : side * (38 + rnd() * 30)
    const h = Math.round((top ? 150 : 128 + rnd() * 52) * (1 - t * 0.22))
    const leaf = leaves[(rnd() * leaves.length) | 0]
    const flip = rnd() < 0.5
    let img = sharp(leaf).resize({ height: h })
    if (flip) img = img.flop()
    const sized = await img.png().toBuffer()
    const meta = await sharp(sized).metadata()
    const rot = await sharp(sized).rotate(deg, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer({ resolveWithObject: true })
    const th = (deg * Math.PI) / 180
    const vx = -(meta.height / 2) * Math.sin(th)
    const vy = (meta.height / 2) * Math.cos(th)
    const [px, py] = at(t)
    const left = Math.round(px - (rot.info.width / 2 + vx))
    const topPx = Math.round(py - (rot.info.height / 2 + vy))
    // ảnh vượt mép canvas -> cắt phần thừa
    const cl = Math.max(0, -left), ct = Math.max(0, -topPx)
    const cw = Math.min(rot.info.width - cl, SZ - Math.max(0, left)), ch = Math.min(rot.info.height - ct, SZ - Math.max(0, topPx))
    if (cw <= 0 || ch <= 0) continue
    const piece = await sharp(rot.data).extract({ left: cl, top: ct, width: cw, height: ch }).png().toBuffer()
    comps.push({ input: piece, left: Math.max(0, left), top: Math.max(0, topPx) })
  }
  await sharp({ create: { width: SZ, height: SZ, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(comps)
    .webp({ quality: 82, alphaQuality: 90 })
    .toFile(OUT)
  await sharp(OUT).flatten({ background: '#c8d8e8' }).resize(256).toFile(OUT.replace('.webp', '_prev.png').replace(/.*\//, process.argv[5] + '/'))
  console.log('ok', OUT)
})()
