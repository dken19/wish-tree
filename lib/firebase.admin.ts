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

export function getAdminDb(): Firestore | null {
  const sa = readServiceAccount()
  if (!sa) return null
  if (adminDb) return adminDb
  const app: App = getApps().length
    ? getApp()
    : initializeApp({ credential: cert(sa) })
  adminDb = getFirestore(app)
  return adminDb
}
