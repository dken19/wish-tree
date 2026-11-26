'use client'
import { useId } from 'react'
import type { ReactionKey } from '@/lib/reactions'

// Icon cảm xúc NHIỀU MÀU (SVG vẽ tay, gradient + điểm sáng) — luôn hiện màu, không phụ thuộc currentColor.
// Không dùng emoji (quy ước dự án). useId -> id gradient không trùng khi nhiều icon cùng trang.

const LEAF = 'M12 11.2C8.9 9 7.6 4.4 10 3.4c1-.4 1.7.2 2 .9.3-.7 1-1.3 2-.9 2.4 1 1.1 5.6-2 7.8z'

export default function ReactionIcon({ kind, size = 20 }: { kind: ReactionKey; size?: number }) {
  const uid = useId().replace(/:/g, '')
  const g = (n: string) => `rx-${kind}-${n}-${uid}`

  if (kind === 'heart')
    return (
      <svg className="rx-ic" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <linearGradient id={g('a')} x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0" stopColor="#ff8a98" />
            <stop offset="0.55" stopColor="#f0435e" />
            <stop offset="1" stopColor="#c81d3f" />
          </linearGradient>
        </defs>
        <path
          d="M12 20.6c-.3 0-.6-.1-.8-.3C6.4 16.3 2.6 13 2.6 8.9 2.6 6 4.8 3.8 7.5 3.8c1.9 0 3.5 1 4.5 2.6 1-1.6 2.6-2.6 4.5-2.6 2.7 0 4.9 2.2 4.9 5.1 0 4.1-3.8 7.4-8.6 11.4-.2.2-.5.3-.8.3z"
          fill={`url(#${g('a')})`}
        />
        <path d="M6.2 6.3c.9-.9 2.4-.9 3.2.2" stroke="#fff" strokeOpacity=".75" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <circle cx="5.4" cy="9" r=".9" fill="#fff" fillOpacity=".6" />
      </svg>
    )

  if (kind === 'clover')
    return (
      <svg className="rx-ic" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <radialGradient id={g('a')} cx="0.5" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#9be58e" />
            <stop offset="0.6" stopColor="#3fb35c" />
            <stop offset="1" stopColor="#23803f" />
          </radialGradient>
        </defs>
        {/* cuống cong */}
        <path d="M12.6 12.8c1.2 2.9 2.9 5.4 5.6 7.6" stroke="#2c7a3d" strokeWidth="1.7" strokeLinecap="round" fill="none" />
        {/* 4 lá hình tim xoay quanh tâm */}
        {[0, 90, 180, 270].map((r) => (
          <g key={r} transform={`rotate(${r} 12 12) translate(12 12) scale(1.14) translate(-12 -12.25)`}>
            <path d={LEAF} fill={`url(#${g('a')})`} stroke="#1f7438" strokeOpacity=".35" strokeWidth=".5" />
            <path d="M12 10.4V5.6" stroke="#d9f7cf" strokeOpacity=".8" strokeWidth=".8" strokeLinecap="round" />
          </g>
        ))}
        <circle cx="12" cy="12" r="1.15" fill="#1f7438" />
        <circle cx="10.2" cy="5.4" r=".7" fill="#fff" fillOpacity=".7" />
      </svg>
    )

  // star
  return (
    <svg className="rx-ic" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={g('a')} x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#ffe98a" />
          <stop offset="0.5" stopColor="#ffc531" />
          <stop offset="1" stopColor="#f08c0f" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.6c.4 0 .8.2 1 .6l2.3 4.7 5.2.8c.9.1 1.3 1.3.6 1.9l-3.8 3.7.9 5.2c.2.9-.8 1.6-1.6 1.2L12 18.3l-4.6 2.4c-.8.4-1.8-.3-1.6-1.2l.9-5.2-3.8-3.7c-.7-.6-.3-1.8.6-1.9l5.2-.8L11 3.2c.2-.4.6-.6 1-.6z"
        fill={`url(#${g('a')})`}
        stroke="#e07f06"
        strokeOpacity=".55"
        strokeWidth=".6"
        strokeLinejoin="round"
      />
      <path d="M9.6 9.2l1.4-2.9" stroke="#fff" strokeOpacity=".8" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="16.4" cy="16.6" r=".7" fill="#fff" fillOpacity=".45" />
    </svg>
  )
}
