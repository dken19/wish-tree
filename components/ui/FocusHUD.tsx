'use client'
import { useEffect, useRef, useState } from 'react'
import { useScene } from '@/store/useScene'
import { storeName } from '@/lib/presence'

type Phase = 'idle' | 'focus' | 'break'
type Preset = { label: string; focus: number; brk: number }
const PRESETS: Preset[] = [
  { label: '25 / 5', focus: 25, brk: 5 },
  { label: '50 / 10', focus: 50, brk: 10 },
]

function beep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ac = new Ctx()
    const o = ac.createOscillator()
    const g = ac.createGain()
    o.connect(g)
    g.connect(ac.destination)
    o.frequency.value = 660
    g.gain.setValueAtTime(0.0001, ac.currentTime)
    g.gain.exponentialRampToValueAtTime(0.2, ac.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.9)
    o.start()
    o.stop(ac.currentTime + 0.95)
  } catch {
    /* bỏ qua nếu trình duyệt chặn audio */
  }
}

// Một ô số kiểu "flip"
function FlipCard({ ch }: { ch: string }) {
  return <span className="flip-card">{ch}</span>
}

export default function FocusHUD() {
  const roomOpen = useScene((s) => s.roomOpen)
  const setRoomOpen = useScene((s) => s.setRoomOpen)
  const sessions = useScene((s) => s.sessions)
  const nickname = useScene((s) => s.nickname)
  const setNickname = useScene((s) => s.setNickname)
  const showToast = useScene((s) => s.showToast)

  // ----- đồng hồ flip: giờ hiện tại -----
  const [clock, setClock] = useState('00:00:00')
  useEffect(() => {
    const update = () => {
      const d = new Date()
      const p = (n: number) => String(n).padStart(2, '0')
      setClock(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  // ----- Pomodoro -----
  const [preset, setPreset] = useState<Preset>(PRESETS[0])
  const [phase, setPhase] = useState<Phase>('idle')
  const [running, setRunning] = useState(false)
  const [left, setLeft] = useState(PRESETS[0].focus * 60) // giây còn lại
  const endsAt = useRef(0) // mốc kết thúc (ms) khi đang chạy
  const phaseRef = useRef<Phase>('idle')
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  // bộ đếm dựa mốc thời gian (không drift khi tab ở nền)
  useEffect(() => {
    if (!running) return
    let raf = 0
    const tick = () => {
      const rem = Math.max(0, Math.round((endsAt.current - Date.now()) / 1000))
      setLeft(rem)
      if (rem <= 0) {
        beep()
        const next: Phase = phaseRef.current === 'focus' ? 'break' : 'focus'
        const mins = next === 'focus' ? preset.focus : preset.brk
        setPhase(next)
        endsAt.current = Date.now() + mins * 60_000
        setLeft(mins * 60)
        showToast(next === 'focus' ? 'Hết giải lao — quay lại tập trung 🧘' : 'Hết phiên — nghỉ một chút ☕')
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running, preset, showToast])

  function start() {
    const ph: Phase = phase === 'idle' ? 'focus' : phase
    setPhase(ph)
    endsAt.current = Date.now() + left * 1000
    setRunning(true)
  }
  function pause() {
    setRunning(false)
  }
  function reset() {
    setRunning(false)
    setPhase('idle')
    setLeft(preset.focus * 60)
  }
  function pickPreset(p: Preset) {
    setPreset(p)
    setRunning(false)
    setPhase('idle')
    setLeft(p.focus * 60)
  }

  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')
  const pomoLabel =
    phase === 'focus' ? 'Đang tập trung' : phase === 'break' ? 'Đang giải lao' : 'Sẵn sàng'

  return (
    <div className={`focus-hud${roomOpen ? ' show' : ''}`}>
      <div className="fh-top">
        <span className="fh-online">🟢 {sessions.length} đang ôn cùng bạn</span>
        <button className="fh-leave" onClick={() => setRoomOpen(false)}>
          Rời phòng
        </button>
      </div>

      {/* đồng hồ flip (giờ hiện tại) */}
      <div className="flip-clock">
        {clock.split('').map((c, i) =>
          c === ':' ? (
            <span key={i} className="flip-colon">
              :
            </span>
          ) : (
            <FlipCard key={i} ch={c} />
          )
        )}
      </div>

      {/* Pomodoro */}
      <div className="pomo">
        <div className={`pomo-time ${phase}`}>
          {mm}:{ss}
        </div>
        <div className="pomo-label">{pomoLabel}</div>
        <div className="pomo-presets">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              className={preset.label === p.label ? 'on' : ''}
              onClick={() => pickPreset(p)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="pomo-row">
          {!running ? (
            <button className="pomo-go" onClick={start}>
              {phase === 'idle' ? 'Bắt đầu' : 'Tiếp tục'}
            </button>
          ) : (
            <button className="pomo-go" onClick={pause}>
              Tạm dừng
            </button>
          )}
          <button className="pomo-reset" onClick={reset}>
            Đặt lại
          </button>
        </div>
      </div>

      {/* tên hiển thị */}
      <div className="fh-name">
        <label>Tên hiển thị</label>
        <input
          maxLength={24}
          value={nickname}
          placeholder="Bạn ẩn danh"
          onChange={(e) => {
            setNickname(e.target.value)
            storeName(e.target.value)
          }}
        />
      </div>
    </div>
  )
}
