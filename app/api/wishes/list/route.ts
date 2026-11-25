import { NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getAdminDb, isAdminConfigured } from '@/lib/firebase.admin'
import { isThemeKey, type ThemeKey } from '@/lib/themes'
import { SEED_WISHES } from '@/lib/wishes'
import { foldVi, parseNoQuery, searchTokens } from '@/lib/wishMeta'
import { ensureNumbering, publicWish, type PublicWish } from '@/lib/wishServer'

export const runtime = 'nodejs'

export const PAGE_SIZE = 12
/** Số kết quả tối đa khi tìm theo từ khoá (lọc + phân trang trong bộ nhớ). */
const SEARCH_CAP = 500

type Sort = 'new' | 'old'

/** "2026-11-25" -> [đầu ngày, đầu ngày hôm sau] theo giờ Việt Nam (UTC+7), ms. */
function dayRange(date: string | null): [number, number] | null {
  const m = date?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const start = Date.UTC(+m[1], +m[2] - 1, +m[3]) - 7 * 3600_000
  return [start, start + 24 * 3600_000]
}

function pageOf(all: PublicWish[], page: number) {
  const total = all.length
  return {
    items: all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  }
}

/** Lọc trong bộ nhớ (dùng cho SEED và chế độ tìm từ khoá). */
function filterInMemory(
  list: PublicWish[],
  o: { theme: ThemeKey | null; range: [number, number] | null; words: string[]; sort: Sort }
) {
  const out = list.filter((w) => {
    if (o.theme && w.theme !== o.theme) return false
    if (o.range && (w.createdAt < o.range[0] || w.createdAt >= o.range[1])) return false
    if (o.words.length) {
      const hay = foldVi(w.text)
      if (!o.words.every((t) => hay.includes(t))) return false
    }
    return true
  })
  out.sort((a, b) => (o.sort === 'old' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt))
  return out
}

// GET ?page=&theme=&q=&date=YYYY-MM-DD&sort=new|old : điều ước ĐÃ ĐĂNG (approved).
// - q là "#888"/"888"  -> tìm đúng điều ước số đó.
// - q là chữ           -> `keywords array-contains` từ dài nhất rồi lọc tiếp trong bộ nhớ.
// - còn lại            -> truy vấn Firestore + count(), phân trang ở server.
// Chỉ dùng index đã có (status+createdAt, status+theme+createdAt): sort "cũ nhất" lấy đoạn
// tương ứng từ thứ tự mới-nhất rồi đảo lại (offset = total - page*size) -> khỏi thêm index ASC.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const themeParam = url.searchParams.get('theme')
  const theme = isThemeKey(themeParam) ? themeParam : null
  const sort: Sort = url.searchParams.get('sort') === 'old' ? 'old' : 'new'
  const range = dayRange(url.searchParams.get('date'))
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 80)
  const no = parseNoQuery(q)
  const words = no ? [] : searchTokens(q, 6)

  // Chưa cấu hình Admin: lọc SEED trong JS để dev/preview vẫn xem được.
  if (!isAdminConfigured) {
    const seeds: PublicWish[] = SEED_WISHES.map((w, i) => ({
      id: w.id,
      no: i + 1,
      text: w.text,
      theme: w.theme,
      author: w.author ?? null,
      createdAt: w.createdAt,
      commentCount: 0,
    }))
    if (no) return NextResponse.json(pageOf(seeds.filter((w) => w.no === no), 1))
    return NextResponse.json(pageOf(filterInMemory(seeds, { theme, range, words, sort }), page))
  }

  const db = getAdminDb()!
  const col = db.collection('wishes')

  try {
    await ensureNumbering(db)

    // 1) Tìm theo số thứ tự
    if (no) {
      const snap = await col.where('no', '==', no).limit(3).get()
      const hits = snap.docs.filter((d) => d.get('status') === 'approved').map(publicWish)
      return NextResponse.json(pageOf(hits, 1))
    }

    // 2) Tìm theo từ khoá
    if (words.length) {
      const longest = [...words].sort((a, b) => b.length - a.length)[0]
      const snap = await col
        .where('status', '==', 'approved')
        .where('keywords', 'array-contains', longest)
        .limit(SEARCH_CAP)
        .get()
      const list = filterInMemory(snap.docs.map(publicWish), { theme, range, words, sort })
      return NextResponse.json(pageOf(list, page))
    }

    // 3) Duyệt thường (+ chủ đề, + ngày)
    let base = col.where('status', '==', 'approved') as FirebaseFirestore.Query
    if (theme) base = base.where('theme', '==', theme)
    if (range)
      base = base
        .where('createdAt', '>=', Timestamp.fromMillis(range[0]))
        .where('createdAt', '<', Timestamp.fromMillis(range[1]))

    const total = (await base.count().get()).data().count
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

    let offset = (page - 1) * PAGE_SIZE
    let take = PAGE_SIZE
    if (sort === 'old') {
      const end = total - (page - 1) * PAGE_SIZE // vị trí (theo mới-nhất) sau phần tử cũ nhất của trang
      offset = Math.max(0, end - PAGE_SIZE)
      take = Math.max(0, end - offset)
    }
    const snap = take
      ? await base.orderBy('createdAt', 'desc').offset(offset).limit(take).get()
      : null
    const items = snap ? snap.docs.map(publicWish) : []
    if (sort === 'old') items.reverse()

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
