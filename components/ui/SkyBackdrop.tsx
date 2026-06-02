'use client'
import { SKIES } from '@/lib/weather'
import { useCondition } from '@/store/useScene'

// Nền trời gradient đổi theo thời tiết.
export default function SkyBackdrop() {
  const cond = useCondition()
  return <div id="sky" style={{ background: SKIES[cond] }} />
}
