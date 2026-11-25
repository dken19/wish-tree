import { NextResponse } from 'next/server'
import { getAdminDb, isAdminConfigured } from '@/lib/firebase.admin'
import { millis } from '@/lib/wishServer'

export const runtime = 'nodejs'

const PAGE_SIZE = 12
const SCAN_CAP = 1000

// GET ?page= : "Góc xàm xí" tab Từng tờ — điều ước 'funny' KHÔNG thuộc bộ nào + lí do không duyệt.
// KHÔNG trả tên người viết (tránh bêu người). Dùng lại index (status, createdAt) sẵn có.
export async function GET(req: Request) {
  const page = Math.max(1, Number(new URL(req.url).searchParams.get('page')) || 1)
  const empty = { items: [], page, pageSize: PAGE_SIZE, total: 0, totalPages: 1 }
  if (!isAdminConfigured) return NextResponse.json(empty)

  try {
    // Tờ đã nằm trong 1 "bộ" chỉ hiện ở tab Bộ sưu tập -> lọc ra. Firestore không query được "trường không
    // có" nên đọc hết mục Xàm xí (ít, có trần) rồi lọc + phân trang trong bộ nhớ. Index (status, createdAt).
    const snap = await getAdminDb()!
      .collection('wishes')
      .where('status', '==', 'funny')
      .orderBy('createdAt', 'desc')
      .limit(SCAN_CAP)
      .get()
    const loose = snap.docs.filter((d) => !d.get('funnyGroup'))
    const total = loose.length
    const items = loose.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((d) => {
      const data = d.data()
      return {
        id: d.id,
        no: typeof data.no === 'number' ? data.no : null,
        text: String(data.text ?? ''),
        theme: String(data.theme ?? ''),
        note: String(data.funnyNote ?? ''),
        createdAt: millis(data.createdAt),
      }
    })
    return NextResponse.json(
      { items, page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
    )
  } catch (e) {
    console.error('[wishes/funny] query failed', e)
    return NextResponse.json({ error: 'Không tải được danh sách, thử lại nhé' }, { status: 500 })
  }
}
