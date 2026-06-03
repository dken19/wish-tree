// Helper đăng nhập client (Google/Facebook) trên nền Firebase Auth.
// Server vẫn là nơi quyết định auto-approve: client chỉ lấy ID token rồi gửi kèm.
import {
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { getAuthClient } from './firebase.client'

export type AuthUser = {
  uid: string
  name: string
  photo: string | null
}

function toAuthUser(u: User | null): AuthUser | null {
  if (!u) return null
  return {
    uid: u.uid,
    name: u.displayName || u.email || 'Người ẩn danh',
    photo: u.photoURL ?? null,
  }
}

// Theo dõi trạng thái đăng nhập. Trả hàm hủy (no-op nếu chưa cấu hình).
export function watchAuth(cb: (u: AuthUser | null) => void): () => void {
  const auth = getAuthClient()
  if (!auth) {
    cb(null)
    return () => {}
  }
  return onAuthStateChanged(auth, (u) => cb(toAuthUser(u)))
}

export async function signInGoogle(): Promise<void> {
  const auth = getAuthClient()
  if (!auth) throw new Error('Auth chưa cấu hình')
  await signInWithPopup(auth, new GoogleAuthProvider())
}

export async function signInFacebook(): Promise<void> {
  const auth = getAuthClient()
  if (!auth) throw new Error('Auth chưa cấu hình')
  await signInWithPopup(auth, new FacebookAuthProvider())
}

export async function signOutUser(): Promise<void> {
  const auth = getAuthClient()
  if (auth) await signOut(auth)
}

// ID token để gửi kèm /api/wishes; null nếu chưa đăng nhập.
export async function getIdToken(): Promise<string | null> {
  const auth = getAuthClient()
  return auth?.currentUser ? auth.currentUser.getIdToken() : null
}
