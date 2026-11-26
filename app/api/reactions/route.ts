import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, isAdminConfigured } from '@/lib/firebase.admin'
import { rateLimit } from '@/lib/ratelimit'
import { REACTION_KEYS, isReactionKey, readCounts, type MyReactions } from '@/lib/reactions'
import { viewerFromRequest } from '@/lib/wishServer'

export const runtime = 'nodejs'

const MAX_IDS = 30

function deny(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

const cleanId = (s: string) => s && !s.includes('/') && s.length < 64

// GET ?ids=a,b,c : cảm xúc CỦA MÌNH trên các điều ước (cần đăng nhập) -> { mine: { [id]: { heart: true } } }
export async function GET(req: Request) {
  if (!isAdminConfigured) return NextResponse.json({ mine: {} })
  const viewer = await viewerFromRequest(req)
  if (!viewer) return NextResponse.json({ mine: {} })
  const ids = (new URL(req.url).searchParams.get('ids') ?? '').split(',').filter(cleanId).slice(0, MAX_IDS)
  if (!ids.length) return NextResponse.json({ mine: {} })
  const db = getAdminDb()!
  const docs = await db.getAll(...ids.map((id) => db.doc(`wishes/${id}/reactions/${viewer.uid}`)))
  const mine: Record<string, MyReactions> = {}
  docs.forEach((d, i) => {
    if (!d.exists) return
    const m: MyReactions = {}
    for (const k of REACTION_KEYS) if (d.get(k) === true) m[k] = true
    mine[ids[i]] = m
  })
  return NextResponse.json({ mine })
}

// POST { wishId, kind } : bật/tắt 1 cảm xúc — CHỈ người đăng nhập (verify strict: tài khoản bị khoá thì từ chối),
// chỉ trên điều ước đang treo. Transaction: đổi doc reactions/{uid} + tăng/giảm đếm trên điều ước.
export async function POST(req: Request) {
  if (!isAdminConfigured) return deny(503, 'Máy chủ chưa cấu hình lưu trữ (Firebase Admin)')
  const viewer = await viewerFromRequest(req, true)
  if (!viewer) return deny(401, 'Đăng nhập để thả cảm xúc nhé')
  const body = (await req.json().catch(() => ({}))) as { wishId?: unknown; kind?: unknown }
  const wishId = typeof body.wishId === 'string' ? body.wishId : ''
  if (!cleanId(wishId) || !isReactionKey(body.kind)) return deny(400, 'bad request')
  const kind = body.kind
  if (!rateLimit(`react:${viewer.uid}`, 60, 60_000).ok) return deny(429, 'Bạn bấm hơi nhanh, chậm lại chút nhé.')

  const db = getAdminDb()!
  const wishRef = db.collection('wishes').doc(wishId)
  const mineRef = wishRef.collection('reactions').doc(viewer.uid)
  try {
    const res = await db.runTransaction(async (t) => {
      const [w, m] = await Promise.all([t.get(wishRef), t.get(mineRef)])
      if (!w.exists || w.get('status') !== 'approved') return null
      const on = m.get(kind) !== true
      const counts = readCounts(w.get('reactions'))
      counts[kind] = Math.max(0, (counts[kind] ?? 0) + (on ? 1 : -1))
      t.set(mineRef, { [kind]: on ? true : FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() }, { merge: true })
      t.update(wishRef, { [`reactions.${kind}`]: FieldValue.increment(on ? 1 : -1) })
      const mine: MyReactions = {}
      for (const k of REACTION_KEYS) if (k === kind ? on : m.get(k) === true) mine[k] = true
      return { counts, mine }
    })
    if (!res) return deny(404, 'Điều ước không còn trên cây')
    return NextResponse.json(res)
  } catch (e) {
    console.error('[reactions] failed', e)
    return deny(500, 'Chưa gửi được, thử lại nhé')
  }
}
