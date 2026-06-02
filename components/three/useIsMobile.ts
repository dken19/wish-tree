'use client'
import { useEffect, useState } from 'react'

// Phát hiện mobile/cảm ứng (an toàn SSR: mặc định false rồi cập nhật ở client).
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () =>
      matchMedia('(pointer:coarse)').matches || window.innerWidth < 760
    setMobile(check())
  }, [])
  return mobile
}
