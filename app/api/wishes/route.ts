import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, getAdminAuth, isAdminConfigured } from '@/lib/firebase.admin'
import { validateWish } from '@/lib/profanity'
import { isThemeKey } from '@/lib/themes'
import { ipFromHeaders, rateLimit } from '@/lib/ratelimit'
import { counterRef, ensureNumbering } from '@/lib/wishServer'
import { searchTokens } from '@/lib/wishMeta'

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
      { error: 'Bạn gửi hơi nhanh, thử lại sau ít phút nhé.' },
      { status: 429 }
    )

  if (!isAdminConfigured) {
    return NextResponse.json(
      { error: 'Máy chủ chưa cấu hình lưu trữ (Firebase Admin)' },
      { status: 503 }
    )
  }

  // Người đăng nhập (Google/Facebook): xác minh ID token -> đăng NGAY (approved).
  // Token sai/hết hạn/không có -> giữ hành vi cũ: vào hàng chờ duyệt (pending).
  let uid: string | null = null
  let authorName = author
  const bearer = req.headers.get('authorization')
  const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : null
  if (token) {
    try {
      // checkRevoked=true: tài khoản bị admin khoá (disabled) / thu hồi phiên -> ném lỗi
      const decoded = await getAdminAuth()!.verifyIdToken(token, true)
      uid = decoded.uid
      if (decoded.name) authorName = String(decoded.name).slice(0, 40)
    } catch (e) {
      const code = (e as { code?: string })?.code
      if (code === 'auth/user-disabled')
        return NextResponse.json({ error: 'Tài khoản của bạn đã bị tạm khoá. Liên hệ người giữ cây nếu có nhầm lẫn.' }, { status: 403 })
      uid = null // token không hợp lệ / hết hạn -> coi như ẩn danh
    }
  }
  const status = uid ? 'approved' : 'pending'

  const db = getAdminDb()!
  await ensureNumbering(db)
  // Cấp số thứ tự #N trong transaction với bộ đếm meta/counters -> không trùng số.
  const ref = db.collection('wishes').doc()
  const no = await db.runTransaction(async (t) => {
    const c = await t.get(counterRef(db))
    const n = ((c.data()?.wishNo as number | undefined) ?? 0) + 1
    t.set(counterRef(db), { wishNo: n }, { merge: true })
    t.set(ref, {
      no: n,
      text: text.trim(),
      keywords: searchTokens(text),
      theme,
      ...(authorName ? { author: authorName } : {}),
      ...(uid ? { uid } : {}),
      status,
      commentCount: 0,
      reportCount: 0,
      createdAt: FieldValue.serverTimestamp(),
    })
    return n
  })

  return NextResponse.json({ ok: true, id: ref.id, no, status })
}
