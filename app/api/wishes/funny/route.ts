import { NextResponse } from 'next/server'
import { getAdminDb, isAdminConfigured } from '@/lib/firebase.admin'
import { millis } from '@/lib/wishServer'
import { groupNotes } from '@/lib/funnyCollections'

export const runtime = 'nodejs'

const PAGE_SIZE = 12

// GET ?page= : "Góc xàm xí" — điều ước admin chọn vì vui (status 'funny') + lí do không duyệt.
// KHÔNG trả tên người viết (tránh bêu người). Dùng lại index (status, createdAt) sẵn có.
export async function GET(req: Request) {
  const page = Math.max(1, Number(new URL(req.url).searchParams.get('page')) || 1)
  const empty = { items: [], page, pageSize: PAGE_SIZE, total: 0, totalPages: 1 }
  if (!isAdminConfigured) return NextResponse.json(empty)

  try {
    const base = getAdminDb()!.collection('wishes').where('status', '==', 'funny')
    const [count, snap] = await Promise.all([
      base.count().get(),
      base
        .orderBy('createdAt', 'desc')
        .offset((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .get(),
    ])
    const total = count.data().count
    const groups = await groupNotes(
      getAdminDb()!,
      snap.docs.map((d) => String(d.get('funnyGroup') ?? ''))
    )
    const items = snap.docs.map((d) => {
      const data = d.data()
      const g = data.funnyGroup ? groups.get(String(data.funnyGroup)) : undefined
      return {
        id: d.id,
        no: typeof data.no === 'number' ? data.no : null,
        text: String(data.text ?? ''),
        theme: String(data.theme ?? ''),
        note: String(data.funnyNote ?? ''),
        // thuộc bộ: tên bộ + lí do chung (hiện khi tờ không có lí do riêng)
        group: g ? { title: g.title, note: g.note } : null,
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
