import { NextResponse } from 'next/server'
import { HANOI } from '@/lib/weather'

// Proxy Open-Meteo cho Hà Nội, cache 10 phút ở server.
export const revalidate = 600

export async function GET() {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${HANOI.lat}` +
    `&longitude=${HANOI.lon}` +
    `&current=temperature_2m,weather_code,is_day,precipitation,cloud_cover,wind_speed_10m` +
    `&timezone=Asia/Bangkok`
  try {
    const r = await fetch(url, { next: { revalidate: 600 } })
    if (!r.ok) throw new Error(`open-meteo ${r.status}`)
    const j = await r.json()
    const c = j.current ?? {}
    return NextResponse.json(
      {
        temperature_2m: c.temperature_2m ?? 28,
        weather_code: c.weather_code ?? 1,
        is_day: c.is_day ?? 1,
        precipitation: c.precipitation ?? 0,
        cloud_cover: c.cloud_cover ?? 0,
        wind_speed_10m: c.wind_speed_10m ?? 8,
      },
      { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1200' } }
    )
  } catch {
    // Fallback nhẹ nếu Open-Meteo lỗi
    return NextResponse.json(
      {
        temperature_2m: 28,
        weather_code: 1,
        is_day: 1,
        precipitation: 0,
        cloud_cover: 20,
        wind_speed_10m: 8,
      },
      { status: 200 }
    )
  }
}
