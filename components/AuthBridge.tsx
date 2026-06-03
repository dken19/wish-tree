'use client'
import { useEffect } from 'react'
import { watchAuth } from '@/lib/auth'
import { useScene } from '@/store/useScene'

// Cầu nối đăng nhập (render rỗng): theo dõi Firebase Auth -> ghi user vào store.
export default function AuthBridge() {
  const setUser = useScene((s) => s.setUser)

  useEffect(() => {
    const unsub = watchAuth((u) => setUser(u))
    return () => unsub()
  }, [setUser])

  return null
}
