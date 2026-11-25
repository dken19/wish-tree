'use client'
import { useEffect, useRef, useState } from 'react'
import { useScene } from '@/store/useScene'
import { storeName } from '@/lib/presence'
import { containsProfanity } from '@/lib/profanity'
import Icon from './Icon'
import { walkTo } from '@/lib/runtime'
import { vnClock } from '@/lib/skyPhase'

type Phase = 'idle' | 'focus' | 'break'
type Preset = { label: string; sub: string; focus: number; brk: number }
const PRESETS: Preset[] = [
  { label: '25 phút', sub: 'nghỉ 5', focus: 25, brk: 5 },
  { label: '50 phút', sub: 'nghỉ 10', focus: 50, brk: 10 },
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
  const bots = useScene((s) => s.bots)
  const nickname = useScene((s) => s.nickname)
  const setNickname = useScene((s) => s.setNickname)
  const showToast = useScene((s) => s.showToast)
  const shrineOpen = useScene((s) => s.shrineOpen)
  const blessedUntil = useScene((s) => s.blessedUntil)
  // buff còn hạn? (kiểm tra theo nhịp render; buff 60 phút nên lệch vài giây không sao)
  const [blessed, setBlessed] = useState(false)
  useEffect(() => {
    const check = () => setBlessed(blessedUntil > Date.now())
    const first = setTimeout(check, 0)
    const id = setInterval(check, 30_000)
    return () => {
      clearTimeout(first)
      clearInterval(id)
    }
  }, [blessedUntil])

  const online = sessions.length + bots.length
  const profToastAt = useRef(0) // throttle toast cảnh báo tên có từ bậy

  // panel mở/thu gọn: MẶC ĐỊNH THU GỌN khi vào phòng (đỡ che cảnh), tự mở khi bấm.
  const [open, setOpen] = useState(false)
  const initOpen = useRef(false)
  useEffect(() => {
    if (roomOpen && !initOpen.current) {
      setOpen(false)
      initOpen.current = true
    }
    if (!roomOpen) initOpen.current = false
  }, [roomOpen])

  // ----- giờ Hà Nội (dòng nhỏ trên bảng) — ghi thẳng DOM qua ref, không re-render -----
  const clockRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!roomOpen) return
    const update = () => {
      if (clockRef.current) clockRef.current.textContent = vnClock()
    }
    update()
    const id = setInterval(update, 15_000)
    return () => clearInterval(id)
  }, [roomOpen, open])

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
        // chỉ báo khi đang Ở TRONG phòng (đừng để popup lọt sang màn khác)
        if (useScene.getState().roomOpen)
          showToast(next === 'focus' ? 'Hết giải lao, quay lại tập trung nhé.' : 'Hết phiên. Nghỉ một chút đi.')
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
    <>
      {/* Thanh thu gọn: luôn thấy số online + đồng hồ Pomodoro; bấm để mở bảng */}
      {roomOpen && !open && !shrineOpen && (
        <div className="fh-mini">
          <button className="fh-mini-main" onClick={() => setOpen(true)} aria-label="Mở bảng ôn bài">
            <span className="fh-mini-online">
              <i className="fh-live" aria-hidden="true" />
              {online}
            </span>
            {blessed && (
              <span className="fh-blessed" title="Đang được chúc phúc">
                <Icon name="lantern" size={15} />
              </span>
            )}
            <span className={`fh-mini-time ${phase}`}>
              {phase === 'idle' ? 'Hẹn giờ ôn bài' : `${mm}:${ss}`}
            </span>
            <Icon name="up" size={16} />
          </button>
          <button className="fh-mini-leave" onClick={() => setRoomOpen(false)}>
            Rời phòng
          </button>
        </div>
      )}

      <section
        className={`focus-hud ${phase}${roomOpen && open && !shrineOpen ? ' show' : ''}`}
        aria-label="Bảng ôn bài"
        aria-hidden={!(roomOpen && open && !shrineOpen)}
      >
        <div className="fh-top">
          <span className="fh-online">
            <i className="fh-live" aria-hidden="true" />
            {online} người đang ôn cùng bạn
          </span>
          <button className="fh-icon" onClick={() => setOpen(false)} aria-label="Thu gọn bảng">
            <Icon name="chev" size={18} />
          </button>
        </div>

        {/* Pomodoro: số flip lớn */}
        <div className="fh-status">
          <span className="fh-phase">{pomoLabel}</span>
          <span className="fh-clock">
            Hà Nội <span ref={clockRef} />
          </span>
        </div>
        <div className="flip-clock" role="timer" aria-label={`Còn ${mm} phút ${ss} giây`}>
          <FlipCard ch={mm[0]} />
          <FlipCard ch={mm[1]} />
          <span className="flip-colon">:</span>
          <FlipCard ch={ss[0]} />
          <FlipCard ch={ss[1]} />
        </div>

        <div className="pomo-presets" role="group" aria-label="Độ dài một phiên">
          {PRESETS.map((p) => (
            <button key={p.label} aria-pressed={preset.label === p.label} onClick={() => pickPreset(p)}>
              <b>{p.label}</b>
              <span>{p.sub}</span>
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
          <button className="pomo-reset" onClick={reset} disabled={phase === 'idle' && !running}>
            Đặt lại
          </button>
        </div>

        <button
          className="fh-shrine"
          onClick={() => {
            setOpen(false)
            walkTo('shrine')
          }}
        >
          <Icon name="lantern" size={18} />
          <span>
            <b>{blessed ? 'Bạn đang được chúc phúc' : 'Ra bàn thờ xin lời chúc'}</b>
            <i>{blessed ? 'Xem lại lời chúc hôm nay' : 'Vái 3 lần, nhận may mắn cho hôm nay'}</i>
          </span>
          <Icon name="chev" size={16} />
        </button>

        <button
          className="fh-seat"
          onClick={() => {
            setOpen(false)
            walkTo('seat')
          }}
        >
          Về chỗ ngồi của mình
        </button>

        <div className="fh-foot">
          <label className="fh-name">
            <span>Tên của bạn</span>
            <input
              maxLength={24}
              value={nickname}
              placeholder="Bạn ẩn danh"
              onChange={(e) => {
                const v = e.target.value
                // tên broadcast cho người khác -> LỌC TỪ BẬY: chứa từ cấm thì không lưu/phát
                if (containsProfanity(v)) {
                  const now = Date.now()
                  if (now - profToastAt.current > 2000) {
                    profToastAt.current = now
                    showToast('Tên hiển thị có từ chưa phù hợp.')
                  }
                  return
                }
                setNickname(v)
                storeName(v)
              }}
            />
          </label>
          <button className="fh-leave" onClick={() => setRoomOpen(false)}>
            <Icon name="logout" size={16} />
            Rời phòng
          </button>
        </div>
      </section>
    </>
  )
}
