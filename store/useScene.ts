'use client'
import { create } from 'zustand'
import type { Condition } from '@/lib/weather'
import type { Wish } from '@/lib/wishes'
import type { Session } from '@/lib/presence'

type SceneState = {
  // Thời tiết
  autoCond: Condition
  manual: Condition | null // null = tự động theo Hà Nội
  temp: number | null
  setAuto: (cond: Condition, temp: number | null) => void
  setManual: (cond: Condition | null) => void

  // Điều ước
  wishes: Wish[]
  setWishes: (w: Wish[]) => void
  openWish: Wish | null
  setOpenWish: (w: Wish | null) => void

  // Phòng Rừng Trúc (thiền viện)
  roomOpen: boolean
  setRoomOpen: (v: boolean) => void
  sessions: Session[]
  setSessions: (s: Session[]) => void
  nickname: string
  setNickname: (n: string) => void

  // UI
  composerOpen: boolean
  setComposerOpen: (v: boolean) => void
  toast: string | null
  toastId: number
  showToast: (msg: string) => void
  loaded: boolean
  setLoaded: (v: boolean) => void
}

export const useScene = create<SceneState>((set) => ({
  autoCond: 'clear',
  manual: null,
  temp: null,
  setAuto: (cond, temp) => set({ autoCond: cond, temp }),
  setManual: (cond) => set({ manual: cond }),

  wishes: [],
  setWishes: (w) => set({ wishes: w }),
  openWish: null,
  setOpenWish: (w) => set({ openWish: w }),

  roomOpen: false,
  setRoomOpen: (v) => set({ roomOpen: v }),
  sessions: [],
  setSessions: (s) => set({ sessions: s }),
  nickname: '',
  setNickname: (n) => set({ nickname: n }),

  composerOpen: false,
  setComposerOpen: (v) => set({ composerOpen: v }),
  toast: null,
  toastId: 0,
  showToast: (msg) => set((s) => ({ toast: msg, toastId: s.toastId + 1 })),
  loaded: false,
  setLoaded: (v) => set({ loaded: v }),
}))

/** Điều kiện thời tiết hiệu lực (manual ghi đè auto). */
export function effectiveCondition(s: SceneState): Condition {
  return s.manual ?? s.autoCond
}

export const useCondition = () =>
  useScene((s) => s.manual ?? s.autoCond)
