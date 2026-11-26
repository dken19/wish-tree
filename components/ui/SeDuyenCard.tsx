import Icon from './Icon'

/** Trang Se duyên = web Mai Mối (dự án riêng): xem duyên phận + tìm người hợp. */
export const SE_DUYEN_URL = 'https://www.mai-moi.online/?utm_source=cayuocnguyen&utm_medium=tab-tinh-yeu'

/**
 * Thẻ CTA ở tab "Tình yêu" (/dieu-uoc?theme=yeu): hai tờ ước treo hai đầu, nối bằng sợi chỉ đỏ
 * thắt thành trái tim ở giữa (tự vẽ ra + tim đập nhẹ). Cả thẻ là link mở Mai Mối ở tab mới.
 * Chỉ SVG + CSS (.sd-* trong app/pages.css), không JS.
 */
export default function SeDuyenCard() {
  return (
    <a className="sd" href={SE_DUYEN_URL} target="_blank" rel="noopener">
      <svg className="sd-art" viewBox="0 0 240 92" aria-hidden="true">
        {/* dây treo + tờ ước trái */}
        <g className="sd-tag sd-tag-l">
          <path d="M30 4v18" className="sd-hang" />
          <rect x="17" y="22" width="26" height="40" rx="3" />
          <circle cx="30" cy="29" r="2.2" className="sd-hole" />
          <path d="M23 40h14M23 46h10M23 52h12" className="sd-lines" />
        </g>
        {/* dây treo + tờ ước phải */}
        <g className="sd-tag sd-tag-r">
          <path d="M210 4v18" className="sd-hang" />
          <rect x="197" y="22" width="26" height="40" rx="3" />
          <circle cx="210" cy="29" r="2.2" className="sd-hole" />
          <path d="M203 40h14M203 46h10M203 52h12" className="sd-lines" />
        </g>
        {/* chỉ đỏ: từ tờ trái, thắt hình trái tim ở giữa, sang tờ phải */}
        <path
          className="sd-thread"
          pathLength={1}
          d="M43 56C70 80 98 74 112 58C96 42 104 22 120 36C136 22 144 42 128 58C142 74 170 80 197 56"
        />
        <g className="sd-spark">
          <path d="M120 8c.4 3 1.6 4.2 4.6 4.6-3 .4-4.2 1.6-4.6 4.6-.4-3-1.6-4.2-4.6-4.6 3-.4 4.2-1.6 4.6-4.6z" />
          <path d="M150 20c.3 2 1 2.7 3 3-2 .3-2.7 1-3 3-.3-2-1-2.7-3-3 2-.3 2.7-1 3-3z" />
          <path d="M88 24c.3 2 1 2.7 3 3-2 .3-2.7 1-3 3-.3-2-1-2.7-3-3 2-.3 2.7-1 3-3z" />
        </g>
      </svg>
      <div className="sd-body">
        <p className="sd-title">Se duyên</p>
        <p className="sd-text">
          Ông Tơ Bà Nguyệt nghe hết rồi. Xem ai hợp với bạn nhé.
        </p>
        <span className="sd-cta">
          Mở trang Se duyên
          <Icon name="ext" size={15} />
        </span>
      </div>
    </a>
  )
}
