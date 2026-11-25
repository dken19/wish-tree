'use client'
import { useScene } from '@/store/useScene'
import Icon from './Icon'

const fmt = (n: number) => n.toLocaleString('vi-VN')

// Huy hiệu dưới tiêu đề: số điều ước đang treo trên cây + số đang chờ duyệt.
// Để người gửi ẩn danh hiểu điều ước của mình chưa hiện là vì đang trong hàng chờ.
export default function WishStats() {
  const stats = useScene((s) => s.stats)
  if (!stats) return null
  return (
    <a className="wish-stats" href="/dieu-uoc" title="Xem tất cả điều ước">
      <span className="ws-item">
        <Icon name="lantern" size={14} />
        <b>{fmt(stats.approved)}</b> điều ước trên cây
      </span>
      <span className="ws-pending">
        <Icon name="hourglass" size={14} />
        <b>{fmt(stats.pending)}</b> đang chờ duyệt
      </span>
    </a>
  )
}
