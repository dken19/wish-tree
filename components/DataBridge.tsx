'use client'
import { useEffect } from 'react'
import { subscribeApproved } from '@/lib/wishes'
import { randomDayWeather, randomWind } from '@/lib/weather'
import { phaseFromUrl, skyPhase } from '@/lib/skyPhase'
import { windRef } from '@/lib/runtime'
import { useScene } from '@/store/useScene'

// Cầu nối dữ liệu (render rỗng): nạp điều ước realtime + số điều ước + thời tiết (giờ VN + random).
export default function DataBridge() {
  const setWishes = useScene((s) => s.setWishes)
  const setCond = useScene((s) => s.setCond)
  const setStats = useScene((s) => s.setStats)

  // Điều ước đã duyệt (realtime / seed)
  useEffect(() => {
    const unsub = subscribeApproved((w) => setWishes(w))
    return () => unsub()
  }, [setWishes])

  // Số điều ước trên cây + đang chờ duyệt: poll 60s, chỉ khi tab đang hiện (đỡ pin + lượt đọc)
  useEffect(() => {
    let alive = true
    async function fetchStats() {
      if (document.visibilityState !== 'visible') return
      try {
        const r = await fetch('/api/wishes/stats')
        if (!r.ok) return
        const j = await r.json()
        if (alive && typeof j.approved === 'number' && typeof j.pending === 'number')
          setStats({ approved: j.approved, pending: j.pending })
      } catch {
        /* giữ số cũ */
      }
    }
    fetchStats()
    const id = setInterval(fetchStats, 60 * 1000)
    document.addEventListener('visibilitychange', fetchStats)
    return () => {
      alive = false
      clearInterval(id)
      document.removeEventListener('visibilitychange', fetchStats)
    }
  }, [setStats])

  // Thời tiết: đêm theo giờ Việt Nam (skyPhase, ?sky= để xem thử), ban ngày nắng/mây/mưa random,
  // đổi ngẫu nhiên mỗi 15 phút. Kiểm tra mốc giờ mỗi phút (chuyển đêm <-> ngày đúng giờ).
  useEffect(() => {
    let day = randomDayWeather()
    let rolledAt = Date.now()
    function apply() {
      if (Date.now() - rolledAt > 15 * 60_000) {
        day = randomDayWeather()
        rolledAt = Date.now()
      }
      // ?wx=clear|cloud|rain|night để xem thử (QA / chụp màn hình)
      const wx = new URLSearchParams(location.search).get('wx')
      const forced = wx === 'clear' || wx === 'cloud' || wx === 'rain' || wx === 'night' ? wx : null
      const cond = forced ?? ((phaseFromUrl() ?? skyPhase()) === 'night' ? 'night' : day)
      windRef.target = randomWind(cond)
      setCond(cond)
    }
    apply()
    const id = setInterval(apply, 60_000)
    return () => clearInterval(id)
  }, [setCond])

  return null
}
