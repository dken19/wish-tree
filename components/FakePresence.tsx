'use client'
import { useEffect } from 'react'
import { useScene } from '@/store/useScene'
import type { Session } from '@/lib/presence'

// "Bạn học ảo" trong phòng Rừng Trúc — cho phòng đỡ trống + có tương tác.
// KHÔNG ghi Firestore. Lịch vào/ra & đồng hồ phiên TẤT ĐỊNH theo ĐỒNG HỒ THỰC
// (Date.now) -> MỌI THIẾT BỊ thấy CÙNG số người + CÙNG thời gian (đồng bộ qua NTP),
// không cần server. Không dùng Math.random ở runtime (để các máy khớp nhau).

type Persona = { id: string; name: string; seed: number }
const PERSONAS: Persona[] = [
  { id: 'a', name: 'Minh Anh', seed: 10133 },
  { id: 'b', name: 'Bảo', seed: 20389 },
  { id: 'c', name: 'Hà My', seed: 30671 },
  { id: 'd', name: 'Khánh', seed: 40927 },
  { id: 'e', name: 'Linh', seed: 51199 },
  { id: 'f', name: 'Nam', seed: 61463 },
  { id: 'g', name: 'Phương', seed: 71761 },
  { id: 'h', name: 'Quân', seed: 82051 },
  { id: 'i', name: 'Thảo', seed: 92347 },
  { id: 'j', name: 'Trang', seed: 102673 },
  { id: 'k', name: 'Tú', seed: 112979 },
  { id: 'l', name: 'Vy', seed: 123289 },
]

const MIN = 60_000

// Lịch tất định cho mỗi persona (period/duration/offset suy từ seed).
function schedule(seed: number) {
  const period = (35 + (seed % 41)) * MIN // 35..75 phút
  const duration = (8 + ((seed >> 3) % 19)) * MIN // 8..26 phút "có mặt"
  const offset = (seed * 13) % period
  return { period, duration, offset }
}

// Ai đang "có mặt" tại thời điểm now (ms) — thuần hàm của thời gian -> đồng bộ.
function presentBots(now: number): Session[] {
  const out: Session[] = []
  for (const p of PERSONAS) {
    const { period, duration, offset } = schedule(p.seed)
    const phase = (((now - offset) % period) + period) % period
    if (phase < duration) {
      out.push({
        clientId: `bot-${p.id}`,
        name: p.name,
        joinedAt: now - phase, // mốc vào (giống nhau mọi máy) -> đồng hồ phiên khớp
        lastSeen: now,
      })
    }
  }
  // sắp xếp ổn định để vị trí trên vòng ít nhảy
  return out.sort((a, b) => a.clientId.localeCompare(b.clientId))
}

export default function FakePresence() {
  const roomOpen = useScene((s) => s.roomOpen)
  const setBots = useScene((s) => s.setBots)
  const showToast = useScene((s) => s.showToast)

  useEffect(() => {
    if (!roomOpen) return

    let prevIds = new Set<string>()
    let first = true

    const tick = () => {
      const list = presentBots(Date.now())
      const ids = new Set(list.map((b) => b.clientId))
      // chỉ cập nhật store khi TẬP người đổi (đồng hồ phiên tính ở client mỗi frame)
      const changed =
        ids.size !== prevIds.size || [...ids].some((id) => !prevIds.has(id))
      if (changed) {
        setBots(list)
        if (!first) {
          // toast cho người mới vào / vừa rời (sự kiện xảy ra cùng lúc mọi máy)
          for (const b of list)
            if (!prevIds.has(b.clientId)) showToast(`${b.name} vào ôn cùng 🌱`)
          const nameById = new Map(PERSONAS.map((p) => [`bot-${p.id}`, p.name]))
          for (const id of prevIds)
            if (!ids.has(id)) showToast(`${nameById.get(id) ?? 'Ai đó'} rời phòng 👋`)
        }
        prevIds = ids
        first = false
      } else if (first) {
        prevIds = ids
        first = false
      }
    }

    tick()
    const intId = setInterval(tick, 5_000)
    return () => {
      clearInterval(intId)
      useScene.getState().setBots([])
    }
  }, [roomOpen, setBots, showToast])

  return null
}
