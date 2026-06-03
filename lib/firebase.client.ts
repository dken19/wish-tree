// Khởi tạo Firebase client SDK (chỉ đọc điều ước đã duyệt).
// Nếu thiếu cấu hình env, trả về null -> app chạy bằng dữ liệu seed.
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getAuth, type Auth } from 'firebase/auth'

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId)

let db: Firestore | null = null
let auth: Auth | null = null

function getApp_(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(config)
}

export function getDb(): Firestore | null {
  if (!isFirebaseConfigured) return null
  if (db) return db
  db = getFirestore(getApp_())
  return db
}

// Auth client (đăng nhập Google/Facebook). null nếu chưa cấu hình Firebase.
export function getAuthClient(): Auth | null {
  if (!isFirebaseConfigured) return null
  if (auth) return auth
  auth = getAuth(getApp_())
  return auth
}
