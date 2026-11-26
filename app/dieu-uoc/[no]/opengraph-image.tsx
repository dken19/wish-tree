import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { THEMES, isThemeKey } from '@/lib/themes'
import { formatNo } from '@/lib/wishMeta'
import { getWishByNo, parseWishNo } from '@/lib/wishDetail'
import { DEFAULT_SKIN, PLAIN_SKIN, WISH_SKINS, isWishSkin } from '@/lib/wishSkins'

// Ảnh xem trước RIÊNG cho từng điều ước khi dán link vào Facebook/Zalo/Messenger/X/Telegram/Discord.
// 1200×630, cùng skin chủ nhân chọn (ước ẩn danh: giấy trắng). Vẽ bằng satori: mọi div nhiều con phải display:flex.
export const alt = 'Một điều ước treo trên Cây Ước Nguyện'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const revalidate = 300

export default async function Image({ params }: { params: Promise<{ no: string }> }) {
  const no = parseWishNo((await params).no)
  const [w, semibold, regular, logo] = await Promise.all([
    no ? getWishByNo(no) : null,
    readFile(join(process.cwd(), 'app/_fonts/BeVietnamPro-SemiBold.ttf')),
    readFile(join(process.cwd(), 'app/_fonts/BeVietnamPro-Regular.ttf')),
    readFile(join(process.cwd(), 'public/logo.png')),
  ])
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`

  const s = w?.verified ? WISH_SKINS[isWishSkin(w.skin) ? w.skin : DEFAULT_SKIN] : PLAIN_SKIN
  const text = w ? `“${w.text}”` : 'Điều ước này không còn trên cây.'
  const len = text.length
  const fs = len <= 60 ? 54 : len <= 100 ? 44 : len <= 140 ? 38 : 33
  const theme = w && isThemeKey(w.theme) ? THEMES[w.theme] : null

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          fontFamily: 'Be Vietnam Pro',
          backgroundImage: s.bg,
          overflow: 'hidden',
        }}
      >
        {/* quầng sáng sau tờ giấy */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            left: 250,
            width: 700,
            height: 520,
            borderRadius: 9999,
            background: 'radial-gradient(circle, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 70%)',
            display: 'flex',
          }}
        />
        {/* sợi dây treo */}
        <div style={{ display: 'flex', width: 3, height: 44, background: s.accent, marginTop: 0 }} />
        <div
          style={{
            display: 'flex',
            width: 16,
            height: 16,
            marginTop: -4,
            borderRadius: 9999,
            border: `3px solid ${s.accent}`,
            background: s.paper,
          }}
        />

        {/* tờ ước */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 940,
            height: 440,
            marginTop: 4,
            padding: '34px 48px 30px',
            borderRadius: 22,
            background: s.paper,
            color: s.ink,
            boxShadow: '0 30px 60px rgba(0,0,0,0.35)',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {w?.no ? (
              <div style={{ display: 'flex', fontSize: 36, fontWeight: 600, color: s.accent }}>{formatNo(w.no)}</div>
            ) : null}
            {theme && (
              <div
                style={{
                  display: 'flex',
                  padding: '6px 18px',
                  borderRadius: 999,
                  background: theme.color,
                  color: '#fff',
                  fontSize: 22,
                  fontWeight: 600,
                }}
              >
                {theme.label}
              </div>
            )}
            <div
              style={{
                display: 'flex',
                marginLeft: 'auto',
                width: 78,
                height: 70,
                alignItems: 'center',
                justifyContent: 'center',
                border: `3px solid ${s.accent}`,
                borderRadius: 12,
                color: s.accent,
                fontSize: 28,
                fontWeight: 600,
                transform: 'rotate(8deg)',
              }}
            >
              Ước
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flex: 1,
              alignItems: 'center',
              fontSize: fs,
              lineHeight: 1.35,
              fontWeight: 400,
              color: s.ink,
            }}
          >
            {text}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', fontSize: 26, fontWeight: 600, color: w?.verified ? s.accent : s.soft }}>
              {w ? `— ${w.author || 'Ẩn danh'}` : ''}
            </div>
            {w?.achieved && (
              <div
                style={{
                  display: 'flex',
                  padding: '8px 18px',
                  borderRadius: 10,
                  background: '#2f7d55',
                  color: '#fff',
                  fontSize: 24,
                  fontWeight: 600,
                  transform: 'rotate(-4deg)',
                }}
              >
                Đã đạt được
              </div>
            )}
          </div>
        </div>

        {/* chân: logo + tên miền */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 26,
            color: s.onBg,
            fontSize: 24,
          }}
        >
          <img src={logoSrc} width={40} height={40} style={{ borderRadius: 10 }} alt="" />
          <div style={{ display: 'flex', fontWeight: 600 }}>Cây Ước Nguyện</div>
          <div style={{ display: 'flex', opacity: 0.8 }}>· cayuocnguyen.io.vn</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Be Vietnam Pro', data: regular, style: 'normal', weight: 400 },
        { name: 'Be Vietnam Pro', data: semibold, style: 'normal', weight: 600 },
      ],
    }
  )
}
