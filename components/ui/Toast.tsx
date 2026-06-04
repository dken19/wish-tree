'use client'
import { useEffect, useRef, useState } from 'react'
import { useScene } from '@/store/useScene'

// Toast thông báo nhỏ (tự ẩn sau ~2.6s).
export default function Toast() {
  const toast = useScene((s) => s.toast)
  const toastId = useScene((s) => s.toastId)
  const roomOpen = useScene((s) => s.roomOpen)
  const [show, setShow] = useState(false)
  const [msg, setMsg] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!toast) return
    setMsg(toast)
    setShow(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setShow(false), 2600)
  }, [toast, toastId])

  // Đổi màn (vào/ra phòng ôn bài) -> ẩn ngay toast đang hiện, tránh popup phòng
  // "lọt" sang màn khác (và ngược lại).
  useEffect(() => {
    setShow(false)
    if (timer.current) clearTimeout(timer.current)
  }, [roomOpen])

  return <div className={`toast${show ? ' show' : ''}`}>{msg}</div>
}
