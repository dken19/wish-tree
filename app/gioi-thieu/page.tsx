import type { Metadata } from 'next'
import Link from 'next/link'
import { CONTACT_EMAIL } from '@/components/ui/LegalPage'

// Trang giới thiệu TĨNH (server render, KHÔNG Canvas, KHÔNG cần đăng nhập).
// Đây là "Application home page" khai báo trên Google OAuth consent screen:
// Google yêu cầu trang này nêu rõ tên app + mục đích + link Chính sách bảo mật, và xem được khi chưa đăng nhập.
export const metadata: Metadata = {
  title: { absolute: 'Cây Ước Nguyện' },
  applicationName: 'Cây Ước Nguyện',
  description:
    'Cây Ước Nguyện là trang web miễn phí để viết điều ước, treo lên cây 3D và đọc điều ước của mọi người. Không cần đăng nhập để sử dụng.',
  alternates: { canonical: '/gioi-thieu' },
}

export default function AboutPage() {
  return (
    <div className="wishes-page">
      <div className="wishes-inner">
        <Link href="/" className="wishes-back">
          ← Vào Cây Ước Nguyện
        </Link>

        <header className="wishes-hero about-hero about-plain">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Logo Cây Ước Nguyện" width={96} height={96} />
          <div>
            <h1>Cây Ước Nguyện</h1>
            <p>Viết một điều ước, treo lên cây và thả vào gió.</p>
          </div>
        </header>

        <article className="legal-body">
          <p className="about-appname">
            Tên ứng dụng: <b>Cây Ước Nguyện</b>
          </p>
          <h2>Cây Ước Nguyện là gì?</h2>
          <p>
            <b>Cây Ước Nguyện</b> (cayuocnguyen.io.vn) là một trang web <b>miễn phí, phi lợi nhuận</b>{' '}
            lấy cảm hứng từ phong tục treo điều ước của người Việt. Bạn viết một điều ước lên tờ giấy đỏ,
            treo nó lên một cái cây 3D đung đưa theo gió và thời tiết Hà Nội, rồi đọc những điều ước mà
            mọi người khác đã gửi gắm — về thi cử, gia đình, tình yêu, sức khoẻ, ước mơ…
          </p>

          <h2>Bạn có thể làm gì</h2>
          <ul>
            <li>
              <b>Viết điều ước</b> và treo lên cây — <b>không cần tài khoản</b>. Điều ước ẩn danh sẽ được
              kiểm duyệt trước khi hiện lên.
            </li>
            <li>
              <b>Đọc điều ước</b> của mọi người ngay trên cây hoặc ở trang{' '}
              <Link href="/dieu-uoc">Tất cả điều ước</Link>, lọc theo chủ đề.
            </li>
            <li>
              <b>Phòng ôn bài Rừng Trúc</b>: học / làm việc cùng người khác với đồng hồ Pomodoro.
            </li>
            <li>
              <b>Kỹ năng sống</b>: hướng dẫn ngắn về nấu ăn, trồng cây, chụp ảnh, chăm sóc da —{' '}
              <Link href="/ky-nang">xem tại đây</Link>.
            </li>
          </ul>

          <h2>Đăng nhập bằng Google dùng để làm gì?</h2>
          <p>
            Đăng nhập là <b>không bắt buộc</b>. Nếu bạn chọn đăng nhập bằng Google, chúng tôi chỉ dùng{' '}
            <b>tên, email và ảnh đại diện</b> của bạn để:
          </p>
          <ul>
            <li>hiện điều ước của bạn ngay lập tức mà không phải chờ duyệt;</li>
            <li>ghi tên bạn bên dưới điều ước;</li>
            <li>chống spam và nội dung xấu.</li>
          </ul>
          <p>
            Chúng tôi không hiển thị email công khai, không bán dữ liệu và không truy cập bất kỳ dữ liệu
            nào khác trong tài khoản Google của bạn. Chi tiết xem{' '}
            <Link href="/chinh-sach-bao-mat">Chính sách bảo mật</Link> và{' '}
            <Link href="/dieu-khoan">Điều khoản sử dụng</Link>.
          </p>

          <h2>Liên hệ</h2>
          <p>
            Góp ý hoặc yêu cầu gỡ nội dung: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>

          <p style={{ marginTop: 20 }}>
            <Link href="/" className="about-cta">
              🌳 Vào Cây Ước Nguyện
            </Link>
          </p>
        </article>

        <footer className="about-foot">
          <Link href="/gioi-thieu">Giới thiệu</Link> ·{' '}
          <Link href="/chinh-sach-bao-mat">Chính sách bảo mật</Link> ·{' '}
          <Link href="/dieu-khoan">Điều khoản</Link>
        </footer>
      </div>
    </div>
  )
}
