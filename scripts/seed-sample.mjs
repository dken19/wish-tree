// Đưa ĐIỀU ƯỚC MẪU "Xuân Phong" (có ảnh + giao diện Trăng đêm + khung Mây lành) lên Firestore + Storage THẬT.
// Dùng: npm run seed:mau   (cần FIREBASE_* + NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET/FIREBASE_STORAGE_BUCKET trong .env.local)
// Chạy lại KHÔNG tạo bản trùng (doc id cố định 'mau-xuan-phong'). Nội dung giống seed-9 ở lib/wishes.ts.
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

try {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
  }
} catch {
  /* không sao nếu chạy với env có sẵn */
}

const projectId = process.env.FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
if (!projectId || !clientEmail || !privateKey || !bucketName) {
  console.error('Thiếu FIREBASE_* hoặc tên bucket Storage trong .env.local')
  process.exit(1)
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
const db = getFirestore()
const bucket = getStorage().bucket(bucketName)

const ID = 'mau-xuan-phong'
const TEXT =
  'Đi làm về muộn, người mệt rã rời, có hôm chỉ muốn buông hết. Nhưng mình ước mai thức dậy vẫn đủ sức cố thêm một chút. Chậm cũng được, miễn là không dừng lại.'

// giống searchTokens (lib/wishMeta): bỏ dấu, chữ thường, từ ≥2 ký tự, duy nhất
const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
const keywords = [...new Set(fold(TEXT).split(/[^a-z0-9]+/).filter((w) => w.length >= 2))].slice(0, 40)

// Bộ đếm #N phải có sẵn (app tự tạo ở lần gửi/xem danh sách đầu tiên qua ensureNumbering). Nếu script tạo
// bộ đếm trước, ensureNumbering sẽ tưởng đã đánh số xong -> các ước cũ mất số.
if (!(await db.doc('meta/counters').get()).exists) {
  console.error('Chưa có meta/counters: mở /dieu-uoc trên web 1 lần (để app đánh số các ước cũ) rồi chạy lại.')
  process.exit(1)
}

const ref = db.collection('wishes').doc(ID)
if ((await ref.get()).exists) {
  console.log(`Điều ước mẫu đã có (wishes/${ID}), bỏ qua.`)
  process.exit(0)
}

// 1) ảnh: đã nén WebP sẵn (public/samples), tải lên giống server (token tải Firebase)
const path = `wishes/${ID}.webp`
const token = randomUUID()
await bucket.file(path).save(readFileSync(new URL('../public/samples/xuan-phong-lam-viec.webp', import.meta.url)), {
  resumable: false,
  contentType: 'image/webp',
  metadata: { cacheControl: 'public, max-age=31536000, immutable', metadata: { firebaseStorageDownloadTokens: token } },
})
const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`

// 2) doc: cấp số #N như POST /api/wishes. uid giả 'sample' -> hiện như ước người đăng nhập (lấp lánh, skin, khung)
const no = await db.runTransaction(async (t) => {
  const c = await t.get(db.doc('meta/counters'))
  const n = (c.data()?.wishNo ?? 0) + 1
  t.set(db.doc('meta/counters'), { wishNo: n }, { merge: true })
  t.set(ref, {
    no: n,
    text: TEXT,
    keywords,
    theme: 'tam',
    author: 'Xuân Phong',
    uid: 'sample-xuan-phong',
    status: 'approved',
    skin: 'trang-dem',
    frame: 'may',
    image: { url, w: 1280, h: 851, path },
    commentCount: 0,
    reportCount: 0,
    createdAt: FieldValue.serverTimestamp(),
  })
  return n
})
console.log(`Đã thêm điều ước mẫu #${no} (wishes/${ID}) — xem ở /dieu-uoc/${no}`)
process.exit(0)
