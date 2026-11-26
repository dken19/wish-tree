'use client'
import { useEffect, useState } from 'react'
import { useScene } from '@/store/useScene'
import { getIdToken, signInGoogle } from '@/lib/auth'
import { isFirebaseConfigured } from '@/lib/firebase.client'
import { REACTIONS, type MyReactions, type ReactionCounts, type ReactionKey } from '@/lib/reactions'
import Icon from './Icon'

// Bản dev chưa có Firebase: bấm thử được (chỉ đổi trong bộ nhớ) để xem giao diện.
const DEMO = !isFirebaseConfigured && process.env.NODE_ENV !== 'production'

/**
 * Cảm xúc CỦA MÌNH trên nhiều điều ước — 1 request cho cả trang (GET /api/reactions?ids=).
 * Chưa đăng nhập -> {} (không gọi mạng).
 */
export function useMyReactions(ids: string[]) {
  const user = useScene((s) => s.user)
  const key = ids.filter((id) => !id.startsWith('seed-')).join(',')
  const [mine, setMine] = useState<Record<string, MyReactions>>({})
  useEffect(() => {
    if (!user || !key || DEMO) return
    let alive = true
    getIdToken()
      .then((token) =>
        token ? fetch(`/api/reactions?ids=${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${token}` } }) : null
      )
      .then((r) => (r && r.ok ? r.json() : null))
      .then((j) => {
        if (alive && j?.mine) setMine((m) => ({ ...m, ...j.mine }))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [user, key])
  return [mine, setMine] as const
}

/**
 * Hàng nút cảm xúc (tim / cỏ bốn lá / sao) dưới một điều ước.
 * Bấm khi chưa đăng nhập -> mở đăng nhập Google rồi thả luôn. Đổi lạc quan, lỗi thì trả lại.
 */
export default function Reactions({
  wishId,
  counts,
  mine,
  onMine,
  compact = false,
}: {
  wishId: string
  counts?: ReactionCounts
  mine?: MyReactions
  onMine?: (m: MyReactions) => void
  compact?: boolean
}) {
  const user = useScene((s) => s.user)
  const showToast = useScene((s) => s.showToast)
  // số đếm cục bộ sau khi mình bấm (ghi đè số từ server cho tới khi đổi điều ước)
  const [local, setLocal] = useState<{ id: string; counts: ReactionCounts; mine: MyReactions } | null>(null)
  const [busy, setBusy] = useState<ReactionKey | null>(null)
  const [pop, setPop] = useState<ReactionKey | null>(null)
  const cur = local?.id === wishId ? local : null
  const c = cur?.counts ?? counts ?? {}
  const m = cur?.mine ?? mine ?? {}
  const isSeed = wishId.startsWith('seed-')

  const toggle = async (k: ReactionKey) => {
    if (busy) return
    if (isSeed && !DEMO) return
    if (!user && !DEMO) {
      if (!isFirebaseConfigured) return
      try {
        await signInGoogle()
      } catch {
        showToast('Đăng nhập để thả cảm xúc nhé')
        return
      }
    }
    const on = !m[k]
    const nextCounts = { ...c, [k]: Math.max(0, (c[k] ?? 0) + (on ? 1 : -1)) }
    const nextMine = { ...m, [k]: on }
    setLocal({ id: wishId, counts: nextCounts, mine: nextMine })
    onMine?.(nextMine)
    if (on) {
      setPop(k)
      setTimeout(() => setPop((p) => (p === k ? null : p)), 600)
    }
    if (DEMO) return
    setBusy(k)
    try {
      const token = await getIdToken()
      const r = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ wishId, kind: k }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) {
        setLocal({ id: wishId, counts: c, mine: m })
        onMine?.(m)
        showToast(j?.error ?? 'Chưa gửi được, thử lại nhé')
        return
      }
      setLocal({ id: wishId, counts: j.counts ?? nextCounts, mine: j.mine ?? nextMine })
      onMine?.(j.mine ?? nextMine)
    } catch {
      setLocal({ id: wishId, counts: c, mine: m })
      onMine?.(m)
      showToast('Chưa gửi được, thử lại nhé')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className={`rx${compact ? ' rx-compact' : ''}`} role="group" aria-label="Thả cảm xúc">
      {REACTIONS.map((r) => {
        const n = c[r.key] ?? 0
        const on = !!m[r.key]
        return (
          <button
            key={r.key}
            className={`rx-btn${on ? ' on' : ''}${pop === r.key ? ' pop' : ''}`}
            style={{ '--rx-c': r.color } as React.CSSProperties}
            aria-pressed={on}
            aria-label={`${r.hint}${n ? ` (${n})` : ''}`}
            title={r.hint}
            disabled={busy === r.key}
            onClick={() => toggle(r.key)}
          >
            <Icon name={r.key} size={compact ? 16 : 18} />
            <span className="rx-n">{n > 0 ? n.toLocaleString('vi-VN') : compact ? '' : r.label}</span>
          </button>
        )
      })}
    </div>
  )
}
