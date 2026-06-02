'use client'
import { WX_ICON, WX_VI, type Condition } from '@/lib/weather'
import { useScene, useCondition } from '@/store/useScene'

const SWITCHES: { w: Condition | 'auto'; label: string }[] = [
  { w: 'auto', label: 'Tự động' },
  { w: 'clear', label: 'Nắng' },
  { w: 'cloud', label: 'Mây' },
  { w: 'rain', label: 'Mưa' },
  { w: 'night', label: 'Đêm' },
]

// Huy hiệu thời tiết Hà Nội + công tắc chuyển thủ công.
export default function WeatherPanel() {
  const cond = useCondition()
  const autoCond = useScene((s) => s.autoCond)
  const manual = useScene((s) => s.manual)
  const temp = useScene((s) => s.temp)
  const setManual = useScene((s) => s.setManual)

  return (
    <div className="ui wx">
      <div className="wx-badge">
        <span className="dot">{WX_ICON[cond]}</span>
        <span>
          Hà Nội · {temp != null ? `${temp}°` : '—'} · {WX_VI[autoCond]}
        </span>
      </div>
      <div className="wx-switch">
        {SWITCHES.map((sw) => {
          const on =
            sw.w === 'auto' ? manual === null : manual === sw.w
          return (
            <button
              key={sw.w}
              className={on ? 'on' : ''}
              onClick={() => setManual(sw.w === 'auto' ? null : sw.w)}
            >
              {sw.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
