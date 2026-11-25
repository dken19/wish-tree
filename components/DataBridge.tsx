'use client'
import { useEffect } from 'react'
import { subscribeApproved } from '@/lib/wishes'
import { condFromCurrent, windFromSpeed, type Condition } from '@/lib/weather'
import { windRef } from '@/lib/runtime'
import { useScene } from '@/store/useScene'

// Cầu nối dữ liệu (render rỗng): nạp điều ước realtime + thời tiết Hà Nội.
export default function DataBridge() {
  const setWishes = useScene((s) => s.setWishes)
  const setAuto = useScene((s) => s.setAuto)
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

  // Thời tiết Hà Nội (qua API route có cache), làm mới mỗi 10 phút
  useEffect(() => {
    let alive = true
    async function fetchWeather() {
      try {
        const r = await fetch('/api/weather')
        if (!r.ok) throw new Error('weather fetch failed')
        const c = await r.json()
        if (!alive) return
        const cond: Condition = condFromCurrent({
          precipitation: c.precipitation ?? 0,
          cloudCover: c.cloud_cover ?? 0,
          isDay: c.is_day,
        })
        windRef.target = windFromSpeed(c.wind_speed_10m)
        setAuto(cond, Math.round(c.temperature_2m))
      } catch {
        if (!alive) return
        setAuto('clear', null)
      }
    }
    fetchWeather()
    const id = setInterval(fetchWeather, 10 * 60 * 1000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [setAuto])

  return null
}
