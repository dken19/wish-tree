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
