import { NextResponse } from 'next/server'
import { getAdminDb, isAdminConfigured } from '@/lib/firebase.admin'
import { SEED_WISHES } from '@/lib/wishes'

export const runtime = 'nodejs'

// GET: số điều ước ĐANG TREO trên cây (approved) + số ĐANG CHỜ DUYỆT (pending).
// Client không đọc được pending (firestore.rules) nên phải đếm ở server bằng count() aggregation
// (rẻ: ~1 read / 1000 doc). Cache ở CDN 30s + bộ nhớ instance 30s để nhiều người mở web cùng lúc
// không làm tăng lượt đọc Firestore.
const TTL = 30_000
let memo: { at: number; data: { approved: number; pending: number } } | null = null

const HEADERS = { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' }

export async function GET() {
  if (!isAdminConfigured) {
    return NextResponse.json({ approved: SEED_WISHES.length, pending: 0 }, { headers: HEADERS })
  }
  if (memo && Date.now() - memo.at < TTL) {
    return NextResponse.json(memo.data, { headers: HEADERS })
  }
  try {
    const col = getAdminDb()!.collection('wishes')
    const [a, p] = await Promise.all([
      col.where('status', '==', 'approved').count().get(),
      col.where('status', '==', 'pending').count().get(),
    ])
    const data = { approved: a.data().count, pending: p.data().count }
    memo = { at: Date.now(), data }
    return NextResponse.json(data, { headers: HEADERS })
  } catch (e) {
    console.error('[wishes/stats] count failed', e)
    if (memo) return NextResponse.json(memo.data, { headers: HEADERS })
    return NextResponse.json({ error: 'Không đếm được điều ước' }, { status: 500 })
  }
}
