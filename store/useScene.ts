'use client'
import { create } from 'zustand'
import type { Condition } from '@/lib/weather'
import type { Wish } from '@/lib/wishes'
import type { Session } from '@/lib/presence'
import type { AuthUser } from '@/lib/auth'

export type WishStats = { approved: number; pending: number }

type SceneState = {
  // Thời tiết: ngày/đêm theo giờ Việt Nam, nắng/mây/mưa random (DataBridge đặt)
  cond: Condition
  setCond: (cond: Condition) => void

  // Điều ước
  wishes: Wish[]
  setWishes: (w: Wish[]) => void
  openWish: Wish | null
  setOpenWish: (w: Wish | null) => void
  /** Số điều ước trên cây (approved) + đang chờ duyệt (pending) — từ /api/wishes/stats. null = chưa tải. */
  stats: WishStats | null
  setStats: (s: WishStats | null) => void
  /** Cộng tạm (optimistic) ngay sau khi gửi, trước lần poll kế tiếp. */
  bumpStats: (status: 'approved' | 'pending') => void

  // Phòng Rừng Trúc (thiền viện)
  roomOpen: boolean
  setRoomOpen: (v: boolean) => void
  sessions: Session[]
  setSessions: (s: Session[]) => void
  bots: Session[] // người "ảo" ngồi học sẵn (tương tác, không phải presence thật)
  setBots: (b: Session[]) => void
  nickname: string
  setNickname: (n: string) => void

  // Đăng nhập (Google/Facebook) — null = ẩn danh
  user: AuthUser | null
  setUser: (u: AuthUser | null) => void

  // Điều hướng (menu dock)
  navOpen: boolean
  setNavOpen: (v: boolean) => void

  // UI
  composerOpen: boolean
  setComposerOpen: (v: boolean) => void
  toast: string | null
  toastId: number
  showToast: (msg: string) => void
  /** Canvas 3D đã dựng + vẽ khung hình đầu (WishTreeCanvas.onCreated). */
  sceneReady: boolean
  setSceneReady: (v: boolean) => void
  /** Màn hình tải (tranh) đã mở xong. */
  loaded: boolean
  setLoaded: (v: boolean) => void
}

export const useScene = create<SceneState>((set) => ({
  cond: 'clear',
  setCond: (cond) => set({ cond }),

  wishes: [],
  setWishes: (w) => set({ wishes: w }),
  openWish: null,
  setOpenWish: (w) => set({ openWish: w }),
  stats: null,
  setStats: (st) => set({ stats: st }),
  bumpStats: (status) =>
    set((s) => (s.stats ? { stats: { ...s.stats, [status]: s.stats[status] + 1 } } : {})),

  roomOpen: false,
  setRoomOpen: (v) => set({ roomOpen: v }),
  sessions: [],
  setSessions: (s) => set({ sessions: s }),
  bots: [],
  setBots: (b) => set({ bots: b }),
  nickname: '',
  setNickname: (n) => set({ nickname: n }),

  user: null,
  setUser: (u) => set({ user: u }),

  navOpen: false,
  setNavOpen: (v) => set({ navOpen: v }),

  composerOpen: false,
  setComposerOpen: (v) => set({ composerOpen: v }),
  toast: null,
  toastId: 0,
  showToast: (msg) => set((s) => ({ toast: msg, toastId: s.toastId + 1 })),
  sceneReady: false,
  setSceneReady: (v) => set({ sceneReady: v }),
  loaded: false,
  setLoaded: (v) => set({ loaded: v }),
}))

export const useCondition = () => useScene((s) => s.cond)
