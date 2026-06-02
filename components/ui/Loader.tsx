'use client'
import { useEffect } from 'react'
import { useScene } from '@/store/useScene'

// Màn hình tải (đèn lồng đung đưa) — ẩn sau khi cảnh sẵn sàng.
export default function Loader() {
  const loaded = useScene((s) => s.loaded)
  const setLoaded = useScene((s) => s.setLoaded)

  useEffect(() => {
    const id = setTimeout(() => setLoaded(true), 900)
    return () => clearTimeout(id)
  }, [setLoaded])

  return (
    <div id="loader" className={loaded ? 'hide' : ''}>
      <div className="l-inner">
        <span className="lamp">🏮</span>
        <p>Đang nhóm gió cho cây…</p>
      </div>
    </div>
  )
}
