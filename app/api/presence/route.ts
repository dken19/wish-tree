import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, isAdminConfigured } from '@/lib/firebase.admin'
import { ipFromHeaders, rateLimit } from '@/lib/ratelimit'

export const runtime = 'nodejs'

type PomoPhase = 'focus' | 'break' | 'idle'
type Body = {
  clientId?: string
  name?: string
  action?: string
  pomo?: { phase?: string; endsAt?: number }
}

const UUID_RE = /^[a-z0-9-]{8,64}$/i
const PHASES: PomoPhase[] = ['focus', 'break', 'idle']

// POST: cập nhật/khởi tạo phiên (heartbeat) hoặc rời phòng (leave).
// Body có thể đến từ fetch (application/json) hoặc navigator.sendBeacon (text/plain).
export async function POST(req: Request) {
  let body: Body
  try {
    // đọc dạng text để nhận cả beacon text/plain lẫn JSON
    const raw = await req.text()
    body = raw ? (JSON.parse(raw) as Body) : {}
  } catch {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 })
  }

  const clientId = String(body.clientId ?? '')
  if (!UUID_RE.test(clientId))
    return NextResponse.json({ error: 'clientId không hợp lệ' }, { status: 400 })

  const action = body.action === 'leave' ? 'leave' : 'heartbeat'
  const name = String(body.name ?? 'Bạn ẩn danh').slice(0, 24) || 'Bạn ẩn danh'

  // Rate-limit nới rộng cho heartbeat (mặc định 5/10ph sẽ chặn nhầm).
  // Khoá theo clientId để không chặn nhầm nhiều người chung NAT/IP.
  const ip = ipFromHeaders(req.headers)
  const rl = rateLimit(`presence:${clientId}:${ip}`, 30, 60_000)
  if (!rl.ok)
    return NextResponse.json({ error: 'Quá nhiều yêu cầu' }, { status: 429 })

  if (!isAdminConfigured) {
    // Không cấu hình Firebase: vẫn cho phòng chạy (client chỉ thấy chính mình).
    return NextResponse.json({ ok: false, configured: false }, { status: 503 })
  }

  const db = getAdminDb()!
  const ref = db.collection('sessions').doc(clientId)

  if (action === 'leave') {
    await ref.delete().catch(() => {})
    return NextResponse.json({ ok: true })
  }

  // pomo hợp lệ (chỉ broadcast khi đổi phase, không bắt buộc)
  const pomoPhase = body.pomo?.phase
  const pomo =
    pomoPhase && PHASES.includes(pomoPhase as PomoPhase)
      ? { phase: pomoPhase as PomoPhase, endsAt: Number(body.pomo?.endsAt) || 0 }
      : undefined

  // Đặt joinedAt CHỈ khi phiên chưa tồn tại (đếm giờ phiên từ lần đầu vào).
  const snap = await ref.get()
  const update: Record<string, unknown> = {
    clientId,
    name,
    lastSeen: FieldValue.serverTimestamp(),
    ...(pomo ? { pomo } : {}),
  }
  if (!snap.exists) update.joinedAt = FieldValue.serverTimestamp()

  await ref.set(update, { merge: true })
  return NextResponse.json({ ok: true })
}
