import { NextResponse } from 'next/server'
import { getAdminDb, isAdminConfigured } from '@/lib/firebase.admin'
import { isThemeKey } from '@/lib/themes'
import { SEED_WISHES } from '@/lib/wishes'

export const runtime = 'nodejs'

export const PAGE_SIZE = 12

type Item = {
  id: string
  text: string
  theme: string
  author: string | null
  createdAt: number
}

// GET ?page=&theme= : danh sách điều ước ĐÃ ĐĂNG (approved), phân trang ở server.
// Cần composite index (xem firestore.indexes.json): status+createdAt, status+theme+createdAt.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const themeParam = url.searchParams.get('theme')
  const theme = isThemeKey(themeParam) ? themeParam : null

  // Chưa cấu hình Admin: phân trang SEED trong JS để dev/preview vẫn xem được.
  if (!isAdminConfigured) {
    const all = SEED_WISHES.filter((w) => !theme || w.theme === theme)
    const total = all.length
    const items = all
      .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
      .map((w) => ({
        id: w.id,
        text: w.text,
        theme: w.theme,
        author: w.author ?? null,
        createdAt: w.createdAt,
      }))
    return NextResponse.json({
      items,
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    })
  }

  const db = getAdminDb()!
  let base = db
    .collection('wishes')
    .where('status', '==', 'approved') as FirebaseFirestore.Query
  if (theme) base = base.where('theme', '==', theme)

  try {
    const totalSnap = await base.count().get()
    const total = totalSnap.data().count
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

    const snap = await base
      .orderBy('createdAt', 'desc')
      .offset((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .get()

    const items: Item[] = snap.docs.map((d) => {
      const data = d.data()
      const ts = data.createdAt as { toMillis?: () => number } | undefined
      return {
        id: d.id,
        text: String(data.text ?? ''),
        theme: String(data.theme ?? ''),
        author: data.author ? String(data.author) : null,
        createdAt: ts?.toMillis ? ts.toMillis() : 0,
      }
    })

    return NextResponse.json({ items, page, pageSize: PAGE_SIZE, total, totalPages })
  } catch (e) {
    // Hay gặp nhất: thiếu composite index (FAILED_PRECONDITION) -> xem firestore.indexes.json.
    const code = (e as { code?: number })?.code
    const needsIndex = code === 9
    console.error('[wishes/list] query failed', e)
    return NextResponse.json(
      {
        error: needsIndex
          ? 'Thiếu Firestore index cho truy vấn này — hãy tạo index (xem firestore.indexes.json / link trong log server).'
          : 'Không tải được danh sách điều ước.',
      },
      { status: needsIndex ? 503 : 500 }
    )
  }
}
