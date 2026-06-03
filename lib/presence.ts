// Lớp presence cho "phòng Rừng Trúc": ai đang online cùng học/làm việc.
// Kiến trúc giống lib/wishes.ts: CLIENT chỉ ĐỌC collection `sessions` qua onSnapshot;
// mọi GHI đi qua /api/presence (Admin SDK). Đồng hồ phiên tính ở client từ joinedAt
// -> KHÔNG ghi mỗi giây. Phiên "còn sống" khi lastSeen còn mới hơn STALE_MS.
import { collection, onSnapshot } from 'firebase/firestore'
import { getDb } from './firebase.client'

export type PomoPhase = 'focus' | 'break' | 'idle'

export type Session = {
  clientId: string
  name: string
  joinedAt: number // epoch ms
  lastSeen: number // epoch ms
  isSelf?: boolean // chính người dùng hiện tại (tô sáng avatar)
  pomo?: { phase: PomoPhase; endsAt: number }
}

// Phiên cũ hơn ngưỡng này coi như đã rời (đóng tab mà không kịp gửi "leave").
export const STALE_MS = 40_000
// Nhịp gửi heartbeat (nhỏ hơn STALE_MS / 2 để 1 nhịp lỡ vẫn còn "sống").
export const HEARTBEAT_MS = 18_000

const ID_KEY = 'wt_presence_id'
const NAME_KEY = 'wt_presence_name'
export const DEFAULT_NAME = 'Bạn ẩn danh'

/** Lấy/khởi tạo clientId ẩn danh (localStorage). Client-only. */
export function getClientId(): string {
  if (typeof window === 'undefined') return 'ssr'
  let id = localStorage.getItem(ID_KEY)
  if (!id) {
    id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem(ID_KEY, id)
  }
  return id
}

/** Tên hiển thị đã lưu (hoặc mặc định). Client-only. */
export function getStoredName(): string {
  if (typeof window === 'undefined') return DEFAULT_NAME
  return localStorage.getItem(NAME_KEY) || DEFAULT_NAME
}

export function storeName(name: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(NAME_KEY, name.slice(0, 24))
}

function parseDoc(id: string, data: Record<string, unknown>): Session {
  const ms = (v: unknown): number => {
    const ts = v as { toMillis?: () => number } | undefined
    return ts?.toMillis ? ts.toMillis() : 0
  }
  const pomo = data.pomo as Session['pomo'] | undefined
  return {
    clientId: id,
    name: String(data.name ?? DEFAULT_NAME),
    joinedAt: ms(data.joinedAt),
    lastSeen: ms(data.lastSeen),
    ...(pomo && typeof pomo.endsAt === 'number' ? { pomo } : {}),
  }
}

/**
 * Đăng ký nhận các phiên đang "còn sống" (realtime).
 * - KHÔNG where/orderBy (tránh composite index) -> lọc staleness + sort ở client.
 * - Chưa cấu hình Firebase: trả về 1 phiên "self" cục bộ để vẫn vào phòng được.
 * Trả về hàm hủy đăng ký.
 */
export function subscribeSessions(
  self: Session,
  cb: (sessions: Session[]) => void
): () => void {
  self.isSelf = true
  const db = getDb()
  if (!db) {
    cb([self])
    return () => {}
  }
  return onSnapshot(
    collection(db, 'sessions'),
    (snap) => {
      const now = Date.now()
      const list = snap.docs
        .map((d) => parseDoc(d.id, d.data() as Record<string, unknown>))
        .filter((s) => now - s.lastSeen < STALE_MS)
        .sort((a, b) => a.joinedAt - b.joinedAt)
      // luôn đảm bảo có chính mình (đề phòng snapshot chưa kịp về)
      if (!list.some((s) => s.clientId === self.clientId)) list.unshift(self)
      for (const s of list) s.isSelf = s.clientId === self.clientId
      cb(list)
    },
    (err) => {
      console.error('subscribeSessions error, chỉ hiển thị mình', err)
      cb([self])
    }
  )
}

type HeartbeatBody = {
  clientId: string
  name: string
  action: 'heartbeat' | 'leave'
  pomo?: { phase: PomoPhase; endsAt: number }
}

/** Gửi nhịp heartbeat (ghi qua /api/presence). */
export async function heartbeat(
  clientId: string,
  name: string,
  pomo?: Session['pomo']
): Promise<void> {
  const body: HeartbeatBody = { clientId, name, action: 'heartbeat', ...(pomo ? { pomo } : {}) }
  try {
    await fetch('/api/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    })
  } catch {
    // mạng chập chờn -> bỏ qua, nhịp sau thử lại
  }
}

/** Rời phòng. Dùng sendBeacon khi đóng tab (đáng tin hơn fetch lúc unload). */
export function leave(clientId: string, name: string): void {
  const body: HeartbeatBody = { clientId, name, action: 'leave' }
  const json = JSON.stringify(body)
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    // gửi text/plain để sendBeacon không kích hoạt preflight; route tự JSON.parse
    navigator.sendBeacon('/api/presence', new Blob([json], { type: 'text/plain' }))
    return
  }
  fetch('/api/presence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: json,
    keepalive: true,
  }).catch(() => {})
}
