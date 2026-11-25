'use client'
import { useEffect, useRef, useState } from 'react'
import { useScene } from '@/store/useScene'

// Màn hình tải: chữ "Cây Ước Nguyện" trên nền giấy dó loang màu nước. Khi cảnh 3D sẵn sàng,
// MÀU NƯỚC LOANG từ vài vết (viền đọng sắc son/chàm, lan theo nhiễu như nước thấm giấy),
// lòng vết trong dần để lộ cây ước nguyện.
//
// Cách làm (nhẹ cho mobile):
//  1) Nền giấy + mảng màu + chữ vẽ 1 LẦN vào canvas 2D (`paper`) — trước hydrate thì HTML/CSS
//     (nền kem + chữ) hiện tạm, khi font sẵn sàng canvas 2D thay vào (crossfade).
//  2) Lúc mở: canvas 2D làm texture cho 1 fragment shader WebGL thuần (1 tam giác full màn hình),
//     chạy ~3s rồi huỷ context. Không WebGL / reduce-motion → mờ dần.
const MIN_SHOW = 1500 // ms — kịp đọc chữ
const MAX_WAIT = 9000 // ms — máy yếu/lỗi: vẫn mở
const REVEAL_MS = 3200

const VERT = `attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}`
const FRAG = `precision highp float;
varying vec2 v;uniform sampler2D tex;uniform float t;uniform vec2 res;uniform float lag;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int k=0;k<5;k++){s+=a*n(p);p=p*2.03+17.;a*=.5;}return s;}
// trường "thời điểm nước tới": khoảng cách tới các vết + domain-warp → mép loang hữu cơ, có tua
float field(vec2 q,float ra){
 vec2 wq=q+(vec2(fbm(q*2.2),fbm(q*2.2+5.2))-.5)*.32;
 float d1=length(wq-vec2(.5*ra,.47));
 float d2=length(wq-vec2(.16*ra,.82))+.2;
 float d3=length(wq-vec2(.86*ra,.16))+.3;
 float d=min(d1,min(d2,d3));
 return d+fbm(q*5.)*.12+fbm(q*18.)*.025;
}
void main(){
 float ra=res.x/res.y;
 vec2 q=v*vec2(ra,1.);
 vec3 paper=texture2D(tex,vec2(v.x,1.-v.y)).rgb;
 float d=field(q,ra);
 float ef=d-t;          // >0: chưa ướt; mép màu nước (front)
 float er=d-(t-lag);    // >0: chưa trong; lòng vết trong suốt đi trễ phía sau (lag hẹp lại ở màn dọc)
 // sắc màu: son đỏ → hồng đào → chàm, loang theo vùng
 float hue=fbm(q*1.3+3.);
 vec3 pig=mix(vec3(.78,.24,.28),vec3(.93,.55,.45),smoothstep(.35,.55,hue));
 pig=mix(pig,vec3(.22,.32,.56),smoothstep(.55,.72,hue));
 float gran=n(v*res/2.)*.5+n(v*res/5.)*.5;        // hạt màu trên thớ giấy
 // lớp màu nước giữa front và lòng trong: mép đậm (pigment dồn ra mép), lòng nhạt
 float inWash=smoothstep(.012,-.004,ef);           // mép trước hơi mềm
 float edgeDark=exp(-max(-ef,0.)*38.);             // đậm nhất ngay mép, nhạt dần vào trong
 float wash=inWash*(.34+.5*edgeDark)*(.82+.36*gran);
 // vân "cauliflower" khi nước loang lại vào lớp màu
 wash*=.85+.3*smoothstep(.45,.6,fbm(q*9.+t*.6));
 vec3 col=paper*mix(vec3(1.),pig,clamp(wash,0.,1.)); // multiply như màu nước thật
 // hơi ẩm phía trước mép: giấy sẫm nhẹ
 col*=1.-.05*smoothstep(.08,0.,ef);
 // lòng vết: trong NGAY sau dải mép (lag hẹp) → lộ cây 3D sạch, KHÔNG vương lớp hồng phủ màn
 float alpha=smoothstep(-.025,.012,er);
 gl_FragColor=vec4(col,alpha);
}`

/** Vẽ nền giấy dó + mảng màu nước + chữ vào canvas 2D (kích thước = màn hình × dpr). */
function paintPaper(cv: HTMLCanvasElement, title: HTMLElement, sub: HTMLElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
  const W = innerWidth
  const H = innerHeight
  cv.width = Math.round(W * dpr)
  cv.height = Math.round(H * dpr)
  const ctx = cv.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  ctx.fillStyle = '#f4ecdc'
  ctx.fillRect(0, 0, W, H)

  // mảng màu nước nhạt (giả lập bằng nhiều vòng gradient chồng, multiply)
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const washes: [number, number, number, string][] = [
    [0.02, 0.05, 0.42, '236,178,168'], // hồng đào
    [0.98, 0.95, 0.45, '176,200,170'], // lá mạ
    [0.97, 0.04, 0.34, '186,206,226'], // xanh trời
    [0.03, 0.97, 0.32, '232,206,160'], // vàng đất
  ]
  ctx.globalCompositeOperation = 'multiply'
  const R = Math.max(W, H)
  for (const [x, y, r, c] of washes) {
    for (let i = 0; i < 9; i++) {
      const cx = (x + (rnd() - 0.5) * 0.16) * W
      const cy = (y + (rnd() - 0.5) * 0.16) * H
      const rr = r * R * (0.45 + rnd() * 0.55)
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr)
      g.addColorStop(0, `rgba(${c},0.12)`)
      g.addColorStop(0.6, `rgba(${c},0.05)`)
      g.addColorStop(1, `rgba(${c},0)`)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
    }
  }

  // thớ giấy: nhiễu mịn
  const tile = document.createElement('canvas')
  tile.width = tile.height = 128
  const tc = tile.getContext('2d')!
  const id = tc.createImageData(128, 128)
  for (let i = 0; i < id.data.length; i += 4) {
    const k = 225 + rnd() * 30
    id.data[i] = id.data[i + 1] = id.data[i + 2] = k
    id.data[i + 3] = 255
  }
  tc.putImageData(id, 0, 0)
  ctx.globalAlpha = 0.22
  ctx.fillStyle = ctx.createPattern(tile, 'repeat')!
  ctx.fillRect(0, 0, W, H)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'

  // chữ: vẽ đúng vị trí/kiểu của phần tử HTML (để crossfade không lệch)
  const drawText = (el: HTMLElement) => {
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
    ctx.fillStyle = cs.color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if ('letterSpacing' in ctx) (ctx as { letterSpacing: string }).letterSpacing = cs.letterSpacing
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    ctx.fillText(el.textContent || '', cx, cy)
    const tw = ctx.measureText(el.textContent || '').width
    return { right: cx + tw / 2, cy, h: parseFloat(cs.fontSize) }
  }
  const tr = drawText(title)
  drawText(sub)

  // con dấu đỏ cạnh chữ
  const s = Math.max(24, Math.min(46, tr.h * 0.36))
  const sx = Math.min(tr.right + s * 0.25, W - s - 10)
  const sy = tr.cy + tr.h * 0.08
  ctx.save()
  ctx.translate(sx + s / 2, sy + s / 2)
  ctx.rotate(-0.06)
  ctx.fillStyle = 'rgba(178,34,40,0.88)'
  ctx.fillRect(-s / 2, -s / 2, s, s)
  ctx.fillStyle = '#f4ecdc'
  ctx.font = `700 ${s * 0.4}px ${getComputedStyle(title).fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Ước', 0, s * 0.02, s * 0.84)
  ctx.restore()
}

function startReveal(gcv: HTMLCanvasElement, src: HTMLCanvasElement, onDone: () => void) {
  const gl = gcv.getContext('webgl', { premultipliedAlpha: false, alpha: true })
  if (!gl) return false
  // nửa độ phân giải: hiệu ứng vốn mềm, mà fbm nhiều lớp ở full-res làm iPhone tụt khung (khung hồng đứng lâu)
  gcv.width = Math.round(src.width / 2)
  gcv.height = Math.round(src.height / 2)
  gl.viewport(0, 0, gcv.width, gcv.height)

  const sh = (type: number, code: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, code)
    gl.compileShader(s)
    return s
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false
  gl.useProgram(prog)

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'p')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src)
  gl.uniform2f(gl.getUniformLocation(prog, 'res'), gcv.width, gcv.height)
  // Dải màu nước (giữa mép mực và lòng trong) đo theo CHIỀU CAO màn hình: màn dọc điện thoại hẹp
  // nên dải 0.2 gần như phủ kín bề ngang -> cả màn ửng hồng ~1s. Thu hẹp theo tỉ lệ khung hình.
  const ra = gcv.width / gcv.height
  gl.uniform1f(gl.getUniformLocation(prog, 'lag'), 0.11 * Math.min(1, Math.max(0.5, ra * 1.4)))
  const revealMs = ra < 0.8 ? REVEAL_MS * 0.8 : REVEAL_MS
  const uT = gl.getUniformLocation(prog, 't')

  // xa nhất từ vết giữa tới góc + biên nhiễu + độ trễ lòng trong → phủ hết màn hình
  const maxR = Math.hypot((0.5 * gcv.width) / gcv.height, 0.55) + 0.45
  const t0 = performance.now()
  const frame = (now: number) => {
    const k = Math.min((now - t0) / revealMs, 1)
    const ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2 // chạm nhẹ → loang → lắng
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.uniform1f(uT, -0.05 + ease * (maxR + 0.05))
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    if (k < 1) requestAnimationFrame(frame)
    else {
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      onDone()
    }
  }
  requestAnimationFrame(frame)
  return true
}

// Đèn trời bay lên (CSS thuần, render cả lúc SSR → hiện ngay). x = vị trí ngang, s = cỡ (xa nhỏ/mờ,
// gần to/rõ), d = thời gian bay, delay âm = đã đang bay sẵn khi vào trang. Tránh cột giữa cho đèn to
// (đỡ che chữ). Mobile chỉ hiện 5 chiếc đầu (CSS).
const LANTERNS = [
  { x: 14, s: 1.25, d: 15, delay: -6 },
  { x: 82, s: 1.05, d: 17, delay: -11 },
  { x: 30, s: 0.6, d: 22, delay: -3 },
  { x: 68, s: 0.7, d: 20, delay: -15 },
  { x: 50, s: 0.45, d: 26, delay: -9 },
  { x: 92, s: 0.5, d: 24, delay: -2 },
  { x: 6, s: 0.55, d: 23, delay: -17 },
  { x: 40, s: 0.38, d: 28, delay: -21 },
  { x: 74, s: 1.4, d: 14, delay: -1 },
]

export default function Loader() {
  const loaded = useScene((s) => s.loaded)
  const sceneReady = useScene((s) => s.sceneReady)
  const setLoaded = useScene((s) => s.setLoaded)
  const [painted, setPainted] = useState(false)
  const [minDone, setMinDone] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [mode, setMode] = useState<'idle' | 'reveal' | 'fade'>('idle')
  const paperRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<HTMLCanvasElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const subRef = useRef<HTMLDivElement>(null)

  // vẽ giấy khi font đã sẵn sàng (+ vẽ lại khi xoay/đổi cỡ màn hình)
  useEffect(() => {
    if (loaded) return
    let alive = true
    const paint = () => {
      if (!alive || !paperRef.current || !titleRef.current || !subRef.current) return
      paintPaper(paperRef.current, titleRef.current, subRef.current)
      setPainted(true)
    }
    document.fonts.ready.then(paint)
    addEventListener('resize', paint)
    return () => {
      alive = false
      removeEventListener('resize', paint)
    }
  }, [loaded])

  useEffect(() => {
    if (loaded) return
    const a = setTimeout(() => setMinDone(true), MIN_SHOW)
    const b = setTimeout(() => setTimedOut(true), MAX_WAIT)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [loaded])

  const go = !loaded && mode === 'idle' && ((sceneReady && minDone && painted) || timedOut)

  useEffect(() => {
    if (!go) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const ok =
      !reduce &&
      painted &&
      paperRef.current &&
      glRef.current &&
      startReveal(glRef.current, paperRef.current, () => setLoaded(true))
    if (ok) {
      setMode('reveal')
    } else {
      setMode('fade') // không WebGL / giảm chuyển động → mờ dần
      setTimeout(() => setLoaded(true), 900)
    }
  }, [go, painted, setLoaded])

  // đã mở một lần (vd quay lại từ /ky-nang) → không hiện lại
  if (loaded) return null

  return (
    <div
      id="loader"
      className={`${painted ? 'painted' : ''} ${mode}`}
      aria-hidden={mode !== 'idle'}
      role="status"
    >
      <canvas ref={paperRef} className="ld-paper" />
      <canvas ref={glRef} className="ld-gl" />
      <div className="ld-sky" aria-hidden>
        {LANTERNS.map((l, i) => (
          <span
            key={i}
            className="ld-lantern"
            style={
              {
                '--x': `${l.x}%`,
                '--s': l.s,
                '--d': `${l.d}s`,
                '--delay': `${l.delay}s`,
              } as React.CSSProperties
            }
          >
            <i />
          </span>
        ))}
      </div>
      <div className="ld-text">
        <div ref={titleRef} className="ld-title">
          Cây Ước Nguyện
        </div>
        <div ref={subRef} className="ld-sub">
          Thả một điều ước vào gió
        </div>
      </div>
      <div className="ld-dots" aria-label="Đang tải">
        <i />
        <i />
        <i />
      </div>
    </div>
  )
}
