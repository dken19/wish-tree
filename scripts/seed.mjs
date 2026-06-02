// Seed vài điều ước mẫu (status: approved) vào Firestore để cây không trống.
// Dùng: node scripts/seed.mjs   (cần biến FIREBASE_* trong .env.local)
import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

// Nạp .env.local thủ công (không phụ thuộc dotenv)
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
if (!projectId || !clientEmail || !privateKey) {
  console.error('Thiếu cấu hình FIREBASE_* trong .env.local')
  process.exit(1)
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
const db = getFirestore()

const SEED = [
  { theme: 'thi', text: 'Mong kỳ thi tới con làm trúng tủ, tay không run. Lạy trời cho con qua môn Toán!', author: 'một người học trò' },
  { theme: 'diem', text: 'Ước lần này bảng điểm toàn 8 trở lên, để về nhà thấy mẹ cười thật tươi.' },
  { theme: 'yeu', text: 'Mong bạn bàn trên một lần quay xuống mượn bút… rồi để quên luôn ở chỗ mình.' },
  { theme: 'nha', text: 'Ước cho bố bớt mệt, mẹ bớt lo, cả nhà mình lại cùng ăn cơm tối đông đủ.' },
  { theme: 'khoe', text: 'Chỉ mong mùa thi này đừng ốm, ngủ đủ giấc và đầu óc luôn tỉnh táo.' },
  { theme: 'mo', text: 'Lớn lên con muốn đi thật xa, nhưng vẫn nhớ đường về lớp học cũ.' },
  { theme: 'ban', text: 'Mong nhóm mình mãi không tan, dù sau này mỗi đứa học một trường.' },
  { theme: 'tam', text: 'Có hôm mệt lắm, chỉ muốn ai đó nói "cố lên, ổn mà". Mình tự nói với mình vậy.' },
]

const batch = db.batch()
for (const w of SEED) {
  const ref = db.collection('wishes').doc()
  batch.set(ref, { ...w, status: 'approved', createdAt: FieldValue.serverTimestamp() })
}
await batch.commit()
console.log(`Đã seed ${SEED.length} điều ước (approved).`)
process.exit(0)
