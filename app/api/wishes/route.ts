import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, isAdminConfigured } from '@/lib/firebase.admin'
import { validateWish } from '@/lib/profanity'
import { isThemeKey } from '@/lib/themes'
import { ipFromHeaders, rateLimit } from '@/lib/ratelimit'

export const runtime = 'nodejs'

// POST: gửi điều ước -> validate + lọc từ + rate-limit -> lưu trạng thái pending.
export async function POST(req: Request) {
  let body: { text?: string; theme?: string; author?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 })
  }

  const text = String(body.text ?? '')
  const theme = String(body.theme ?? '')
  const author = body.author ? String(body.author).slice(0, 40) : undefined

  if (!isThemeKey(theme))
    return NextResponse.json({ error: 'Chủ đề không hợp lệ' }, { status: 400 })

  const v = validateWish(text)
  if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 })

  const ip = ipFromHeaders(req.headers)
  const rl = rateLimit(`wish:${ip}`)
  if (!rl.ok)
    return NextResponse.json(
      { error: 'Bạn gửi hơi nhanh, thử lại sau ít phút nhé 🙏' },
      { status: 429 }
    )

  if (!isAdminConfigured) {
    return NextResponse.json(
      { error: 'Máy chủ chưa cấu hình lưu trữ (Firebase Admin)' },
      { status: 503 }
    )
  }

  const db = getAdminDb()!
  const doc = await db.collection('wishes').add({
    text: text.trim(),
    theme,
    ...(author ? { author } : {}),
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
  })

  return NextResponse.json({ ok: true, id: doc.id })
}
