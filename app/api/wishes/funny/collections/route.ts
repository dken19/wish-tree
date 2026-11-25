import { NextResponse } from 'next/server'
import { getAdminDb, isAdminConfigured } from '@/lib/firebase.admin'
import { loadCollections } from '@/lib/funnyCollections'

export const runtime = 'nodejs'

// GET: các "bộ xàm xí" (công khai, không tên người viết). Bộ không còn tờ nào thì ẩn.
export async function GET() {
  if (!isAdminConfigured) return NextResponse.json({ items: [] })
  try {
    const items = (await loadCollections(getAdminDb()!)).filter((c) => c.wishes.length > 0)
    return NextResponse.json(
      { items },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
    )
  } catch (e) {
    console.error('[wishes/funny/collections] failed', e)
    return NextResponse.json({ error: 'Không tải được bộ sưu tập, thử lại nhé' }, { status: 500 })
  }
}
