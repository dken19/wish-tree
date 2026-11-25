'use client'
import { useEffect, useRef } from 'react'
import { WX_VI, type Condition } from '@/lib/weather'
import { vnClock } from '@/lib/skyPhase'
import { useCondition } from '@/store/useScene'
import Icon, { type IconName } from './Icon'
import AccountButton from './AccountButton'

const WX_IC: Record<Condition, IconName> = { clear: 'sun', cloud: 'cloud', rain: 'rain', night: 'moon' }

// Huy hiệu góc trên-phải (+ nút tài khoản bên cạnh): giờ Việt Nam + thời tiết đang hiện trên cây (ngày/đêm theo giờ VN,
// nắng/mây/mưa random ở DataBridge). Không còn nút chuyển thời tiết.
// Giờ ghi thẳng vào DOM qua ref mỗi 30s (không setState, không lệch hydrate).
export default function WeatherPanel() {
  const cond = useCondition()
  const clockRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const tick = () => {
      if (clockRef.current) clockRef.current.textContent = vnClock()
    }
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="ui wx">
      <p className="wx-badge">
        <Icon name={WX_IC[cond]} size={18} />
        <span className="wx-long">Hà Nội</span>
        <span className="wx-temp" ref={clockRef} />
        <span className="wx-long">{WX_VI[cond].toLowerCase()}</span>
      </p>
      {/* nút hình người: đăng nhập / Điều ước của tôi / đăng xuất */}
      <AccountButton />
    </div>
  )
}
