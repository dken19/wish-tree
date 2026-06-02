'use client'
import { useCallback, useEffect, useState } from 'react'
import { THEMES, isThemeKey } from '@/lib/themes'

type Pending = {
  id: string
  text: string
  theme: string
  author: string | null
}

export default function AdminPage() {
  const [secret, setSecret] = useState('')
  const [items, setItems] = useState<Pending[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const s = localStorage.getItem('wt_admin_secret')
    if (s) setSecret(s)
  }, [])

  const load = useCallback(async () => {
    if (!secret) return
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/admin/wishes', {
        headers: { 'x-admin-secret': secret },
      })
      if (r.status === 401) {
        setError('Sai mã quản trị')
        setItems([])
        return
      }
      const data = await r.json()
      setItems(data.items ?? [])
      localStorage.setItem('wt_admin_secret', secret)
    } catch {
      setError('Không tải được danh sách')
    } finally {
      setLoading(false)
    }
  }, [secret])

  async function act(id: string, action: 'approve' | 'reject') {
    await fetch('/api/admin/wishes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
      body: JSON.stringify({ id, action }),
    })
    setItems((prev) => prev.filter((x) => x.id !== id))
  }

  return (
    <main
      style={{
        maxWidth: 680,
        margin: '0 auto',
        padding: '32px 20px',
        fontFamily: 'system-ui, sans-serif',
        color: '#3a2f2a',
      }}
    >
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Duyệt điều ước</h1>
      <p style={{ color: '#9a8472', marginBottom: 20 }}>
        Chỉ điều ước được duyệt mới hiện lên cây.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          type="password"
          placeholder="Mã quản trị (ADMIN_SECRET)"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid #d8ccbd',
          }}
        />
        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: '10px 18px',
            borderRadius: 10,
            border: 'none',
            background: '#c01730',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Đang tải…' : 'Tải'}
        </button>
      </div>

      {error && <p style={{ color: '#c01730' }}>{error}</p>}
      {!error && items.length === 0 && (
        <p style={{ color: '#9a8472' }}>Không có điều ước nào đang chờ.</p>
      )}

      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 12 }}>
        {items.map((it) => (
          <li
            key={it.id}
            style={{
              border: '1px solid #e7ddcf',
              borderRadius: 14,
              padding: 16,
              background: '#fbf4ea',
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: isThemeKey(it.theme) ? THEMES[it.theme].color : '#9a8472',
                marginBottom: 6,
              }}
            >
              {isThemeKey(it.theme) ? THEMES[it.theme].label : it.theme}
              {it.author ? ` · ${it.author}` : ''}
            </div>
            <p style={{ margin: '0 0 12px', lineHeight: 1.5 }}>{it.text}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => act(it.id, 'approve')}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#3f9d6b',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Duyệt
              </button>
              <button
                onClick={() => act(it.id, 'reject')}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #d8ccbd',
                  background: '#fff',
                  color: '#7a6557',
                  cursor: 'pointer',
                }}
              >
                Bỏ
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
