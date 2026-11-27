// Khởi tạo Firebase Admin SDK (server-only) để ghi điều ước pending & duyệt.
import 'server-only'
import {
  initializeApp,
  getApps,
  getApp,
  cert,
  type App,
} from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { getAuth, type Auth } from 'firebase-admin/auth'
import { getStorage } from 'firebase-admin/storage'

function readServiceAccount() {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  // Private key thường lưu với \n escape trong env
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!projectId || !clientEmail || !privateKey) return null
  return { projectId, clientEmail, privateKey }
}

export const isAdminConfigured = Boolean(readServiceAccount())

let adminDb: Firestore | null = null
let adminAuth: Auth | null = null

function getAdminApp(): App | null {
  const sa = readServiceAccount()
  if (!sa) return null
  return getApps().length ? getApp() : initializeApp({ credential: cert(sa) })
}

export function getAdminDb(): Firestore | null {
  if (adminDb) return adminDb
  const app = getAdminApp()
  if (!app) return null
  adminDb = getFirestore(app)
  return adminDb
}

// Admin Auth: xác minh ID token người đăng nhập (Google/Facebook) phía server.
export function getAdminAuth(): Auth | null {
  if (adminAuth) return adminAuth
  const app = getAdminApp()
  if (!app) return null
  adminAuth = getAuth(app)
  return adminAuth
}

/**
 * Bucket Firebase Storage (ảnh đại diện). Tên bucket: FIREBASE_STORAGE_BUCKET, không có thì dùng lại
 * NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET (cùng giá trị "<project>.firebasestorage.app"). null nếu thiếu.
 */
export const storageBucketName = () =>
  process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || ''

export function getAdminBucket() {
  const app = getAdminApp()
  const name = storageBucketName()
  if (!app || !name) return null
  return getStorage(app).bucket(name)
}
