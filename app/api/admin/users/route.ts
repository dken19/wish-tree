import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import type { UserRecord } from 'firebase-admin/auth'
import { checkAdmin, isAdminEmail } from '@/lib/adminAuth'
import { getAdminAuth, getAdminDb, isAdminConfigured } from '@/lib/firebase.admin'
import { millis } from '@/lib/wishServer'
import { revalidateWishPage } from '@/lib/wishDetail'

export const runtime = 'nodejs'

const PAGE_SIZE = 20
/** Đọc tối đa ngần này tài khoản rồi lọc/sắp xếp trong bộ nhớ (Auth không có truy vấn/sort). */
const MAX_USERS = 3000

function deny(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

const ts = (s?: string) => (s ? Date.parse(s) || 0 : 0)

function toUser(u: UserRecord) {
  return {
    uid: u.uid,
    name: u.displayName ?? '',
    email: u.email ?? '',
    photo: u.photoURL ?? null,
    providers: u.providerData.map((p) => p.providerId),
    createdAt: ts(u.metadata.creationTime),
    lastSignIn: ts(u.metadata.lastSignInTime),
    disabled: u.disabled,
    admin: isAdminEmail(u.email, u.emailVerified),
  }
}

async function allUsers(): Promise<UserRecord[]> {
  const auth = getAdminAuth()!
  const out: UserRecord[] = []
  let token: string | undefined
  do {
    const r = await auth.listUsers(1000, token)
    out.push(...r.users)
    token = r.pageToken
  } while (token && out.length < MAX_USERS)
  return out
}

// GET ?q=&filter=all|banned&page=  : danh sách tài khoản (mới đăng ký trước) + số điều ước của mỗi người.
// GET ?uid=…                        : các điều ước (mọi trạng thái) của 1 tài khoản.
export async function GET(req: Request) {
  const auth = await checkAdmin(req)
  if (!auth.ok) return deny(auth.status, auth.error)
  if (!isAdminConfigured) return NextResponse.json({ items: [], total: 0, page: 1, totalPages: 1, banned: 0 })
  const url = new URL(req.url)
  const db = getAdminDb()!

  const one = url.searchParams.get('uid')
  if (one) {
    const snap = await db.collection('wishes').where('uid', '==', one).limit(200).get()
    const wishes = snap.docs
      .map((d) => ({
        id: d.id,
        no: typeof d.get('no') === 'number' ? (d.get('no') as number) : null,
        text: String(d.get('text') ?? ''),
        status: String(d.get('status') ?? ''),
        flagged: Boolean(d.get('flagged')),
        createdAt: millis(d.get('createdAt')),
      }))
      .sort((a, b) => b.createdAt - a.createdAt)
    return NextResponse.json({ wishes })
  }

  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
  const filter = url.searchParams.get('filter') === 'banned' ? 'banned' : 'all'
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)

  try {
    const users = (await allUsers()).map(toUser)
    const banned = users.filter((u) => u.disabled).length
    const list = users
      .filter((u) => (filter === 'banned' ? u.disabled : true))
      .filter((u) => !q || u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q) || u.uid === q)
      .sort((a, b) => b.createdAt - a.createdAt)
    const total = list.length
    const items = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    // số điều ước mỗi người (count() — rẻ, chỉ cho 20 người của trang)
    const counts = await Promise.all(
      items.map((u) =>
        db
          .collection('wishes')
          .where('uid', '==', u.uid)
          .count()
          .get()
          .then((s) => s.data().count)
          .catch(() => 0)
      )
    )
    return NextResponse.json({
      items: items.map((u, i) => ({ ...u, wishCount: counts[i] })),
      total,
      totalUsers: users.length,
      banned,
      page,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    })
  } catch (e) {
    console.error('[admin/users] list failed', e)
    return deny(500, 'Không tải được danh sách người dùng')
  }
}

// PATCH { uid, action: 'ban'|'unban'|'hide-wishes' }
// ban   = khoá tài khoản (Auth disabled) + thu hồi phiên -> mọi đường ghi (verify strict) từ chối ngay.
// hide-wishes = gỡ mọi điều ước ĐANG TREO của người này (approved -> rejected), dùng cho spam.
export async function PATCH(req: Request) {
  const auth = await checkAdmin(req)
  if (!auth.ok) return deny(auth.status, auth.error)
  if (!isAdminConfigured) return deny(503, 'Máy chủ chưa cấu hình Firebase Admin')
  const body = (await req.json().catch(() => ({}))) as { uid?: unknown; action?: unknown }
  const uid = typeof body.uid === 'string' ? body.uid : ''
  const action = body.action
  if (!uid || (action !== 'ban' && action !== 'unban' && action !== 'hide-wishes'))
    return deny(400, 'bad request')

  const fa = getAdminAuth()!
  let user: UserRecord
  try {
    user = await fa.getUser(uid)
  } catch {
    return deny(404, 'Không tìm thấy tài khoản')
  }

  if (action === 'ban' || action === 'unban') {
    if (action === 'ban' && isAdminEmail(user.email, user.emailVerified))
      return deny(400, 'Không thể khoá tài khoản quản trị')
    await fa.updateUser(uid, { disabled: action === 'ban' })
    if (action === 'ban') await fa.revokeRefreshTokens(uid)
    return NextResponse.json({ ok: true, disabled: action === 'ban' })
  }

  // hide-wishes
  const db = getAdminDb()!
  const snap = await db.collection('wishes').where('uid', '==', uid).where('status', '==', 'approved').get()
  const by = auth.email ?? 'secret'
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = db.batch()
    for (const d of snap.docs.slice(i, i + 400))
      batch.update(d.ref, {
        status: 'rejected',
        flagged: false,
        reviewedAt: FieldValue.serverTimestamp(),
        reviewedBy: by,
      })
    await batch.commit()
  }
  snap.docs.forEach((d) => revalidateWishPage(d.get('no')))
  return NextResponse.json({ ok: true, hidden: snap.size })
}
