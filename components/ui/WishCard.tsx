'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { THEMES } from '@/lib/themes'
import { useScene } from '@/store/useScene'
import { formatNo, formatWishTime } from '@/lib/wishMeta'
import WishThread, { ReportButton } from './WishThread'
import Icon from './Icon'
import WishPhoto from './WishPhoto'
import WishFrame from './WishFrame'
import { WISH_SKINS, skinVars } from '@/lib/wishSkins'
import Sparkles from './Sparkles'
import Reactions, { useMyReactions } from './Reactions'

// Thẻ đọc điều ước (mở khi click một tờ giấy).
export default function WishCard() {
  const openWish = useScene((s) => s.openWish)
  const setOpenWish = useScene((s) => s.setOpenWish)
  const theme = openWish ? THEMES[openWish.theme] : null
  // Mở bình luận theo TỪNG điều ước (đổi tờ giấy -> tự đóng lại)
  const [threadFor, setThreadFor] = useState<string | null>(null)
  const [count, setCount] = useState<{ id: string; n: number } | null>(null)
  const showThread = openWish && threadFor === openWish.id
  const n = openWish && count?.id === openWish.id ? count.n : (openWish?.commentCount ?? 0)
  const isSeed = openWish?.id.startsWith('seed-')
  const verified = !!openWish?.verified
  const skin = verified ? (openWish?.skin ?? null) : null
  // chữ dài hơn chỗ trống -> cuộn trong đoạn chữ; mờ dần mép trên/dưới để báo "còn nữa"
  const textRef = useRef<HTMLParagraphElement>(null)
  const [fade, setFade] = useState({ top: false, bottom: false })
  const measure = () => {
    const t = textRef.current
    if (!t) return
    const top = t.scrollTop > 2
    const bottom = t.scrollTop + t.clientHeight < t.scrollHeight - 2
    setFade((f) => (f.top === top && f.bottom === bottom ? f : { top, bottom }))
  }
  useEffect(() => {
    const t = textRef.current
    if (!t) return
    t.scrollTop = 0
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(t)
    return () => ro.disconnect()
  }, [openWish?.id])
  const [myRx, setMyRx] = useMyReactions(openWish ? [openWish.id] : [])

  return (
    <div
      className={`scrim${openWish ? ' show' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpenWish(null)
      }}
    >
      <div
        className={`card${showThread ? ' with-thread' : ''}${verified ? ' is-verified' : ''}${skin ? ' has-skin' : ''}`}
        style={
          // đã chọn giao diện -> màu giấy/chữ/điểm nhấn theo skin (khung ăn theo điểm nhấn);
          // chưa chọn -> giữ giấy vàng lấp lánh, khung theo màu chủ đề
          (skin ? skinVars(WISH_SKINS[skin]) : theme ? { '--wfr-c': theme.color } : undefined) as React.CSSProperties
        }
      >
        {verified && <WishFrame frame={openWish?.frame} />}
        {verified && <Sparkles key={openWish!.id} />}
        <button className="close" onClick={() => setOpenWish(null)} aria-label="Đóng">
          <Icon name="x" size={18} />
        </button>
        <div
          className="seal"
          style={theme && !skin ? { color: theme.color, borderColor: theme.color } : undefined}
        >
          Ước
        </div>
        <span className="tag" style={theme ? { background: theme.color } : undefined}>
          {theme?.label ?? 'Điều ước'}
        </span>
        {openWish && (openWish.no || openWish.createdAt > 0) && (
          <div className="wish-no">
            {formatNo(openWish.no)}
            {openWish.createdAt > 0 && <span>{formatWishTime(openWish.createdAt)}</span>}
          </div>
        )}
        {openWish?.achieved && (
          <div className="wish-done">
            <Icon name="check" size={14} />
            Đã đạt được
          </div>
        )}
        {openWish?.image && <WishPhoto key={`img-${openWish.id}`} image={openWish.image} variant="card" />}
        <p
          ref={textRef}
          className={`text${fade.top ? ' fade-top' : ''}${fade.bottom ? ' fade-bottom' : ''}`}
          onScroll={measure}
        >
          {openWish ? `“${openWish.text}”` : ''}
        </p>
        <div className="meta">
          {/* Có tên (người đăng nhập) -> thư pháp; không tên -> "Ẩn danh" chữ thường */}
          <span className={verified && openWish?.author ? 'spk-name' : undefined}>
            {openWish?.author || 'Ẩn danh'}
          </span>
        </div>
        {openWish && (
          <Reactions
            wishId={openWish.id}
            counts={openWish.reactions}
            mine={myRx[openWish.id]}
            onMine={(m) => setMyRx((x) => ({ ...x, [openWish.id]: m }))}
          />
        )}
        {openWish && (openWish.no || !isSeed) && (
          <div className="card-actions">
            {openWish.no ? (
              <Link className="wt-link" href={`/dieu-uoc/${openWish.no}`}>
                <Icon name="link" size={16} />
                Mở trang · chia sẻ
              </Link>
            ) : null}
            {!isSeed && (
              <button
                className="wt-link"
                onClick={() => setThreadFor(showThread ? null : openWish.id)}
                aria-expanded={!!showThread}
              >
                <Icon name="comment" size={16} />
                {n > 0 ? `${n} bình luận` : 'Bình luận'}
              </button>
            )}
            {!isSeed && <ReportButton key={openWish.id} wishId={openWish.id} label="Báo cáo" />}
          </div>
        )}
        {showThread && (
          <WishThread
            key={openWish.id}
            wishId={openWish.id}
            onCount={(c) => setCount({ id: openWish.id, n: c })}
          />
        )}
      </div>
    </div>
  )
}
