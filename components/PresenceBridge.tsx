'use client'
import { useEffect } from 'react'
import { useScene } from '@/store/useScene'
import {
  getClientId,
  getStoredName,
  heartbeat,
  leave,
  subscribeSessions,
  HEARTBEAT_MS,
  type Session,
} from '@/lib/presence'

// Cầu nối presence: CHỈ chạy khi đang ở phòng Rừng Trúc.
// - heartbeat ngay + định kỳ (~18s) qua /api/presence (Admin SDK ghi)
// - subscribe sessions realtime -> store
// - rời phòng / đóng tab -> sendBeacon "leave"
export default function PresenceBridge() {
  const roomOpen = useScene((s) => s.roomOpen)
  const nickname = useScene((s) => s.nickname)
  const setSessions = useScene((s) => s.setSessions)

  // nạp tên đã lưu vào store một lần (để HUD hiển thị)
  useEffect(() => {
    if (!useScene.getState().nickname) {
      useScene.getState().setNickname(getStoredName())
    }
  }, [])

  useEffect(() => {
    if (!roomOpen) return
    const clientId = getClientId()
    const nameNow = () => useScene.getState().nickname || getStoredName()

    const self: Session = {
      clientId,
      name: nameNow(),
      joinedAt: Date.now(),
      lastSeen: Date.now(),
      isSelf: true,
    }
    const unsub = subscribeSessions(self, setSessions)

    const beat = () => heartbeat(clientId, nameNow())
    beat()
    const id = setInterval(beat, HEARTBEAT_MS)

    const onHide = () => {
      if (document.visibilityState === 'hidden') leave(clientId, nameNow())
      else beat()
    }
    const onPageHide = () => leave(clientId, nameNow())
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onPageHide)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onPageHide)
      unsub()
      leave(clientId, nameNow())
      setSessions([])
    }
  }, [roomOpen, setSessions])

  // đổi nickname khi đang trong phòng -> đẩy ngay cho người khác thấy
  useEffect(() => {
    if (!roomOpen) return
    heartbeat(getClientId(), useScene.getState().nickname || getStoredName())
  }, [nickname, roomOpen])

  return null
}
