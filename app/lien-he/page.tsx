import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage, { CONTACT_EMAIL } from '@/components/ui/LegalPage'

// Trang liên hệ (tĩnh) — "trust anchor" mà công cụ tìm kiếm / AI agent kiểm tra trước khi giới thiệu site.
export const metadata: Metadata = {
  title: 'Liên hệ',
  description:
    'Liên hệ Cây Ước Nguyện: góp ý, báo lỗi, báo nội dung xấu hoặc yêu cầu gỡ điều ước, bình luận của bạn.',
  alternates: { canonical: '/lien-he' },
}

export default function ContactPage() {
  return (
    <LegalPage title="Liên hệ">
      <p>
        Cây Ước Nguyện (<b>cayuocnguyen.io.vn</b>) là một trang web miễn phí, phi lợi nhuận để mọi người viết
        và treo điều ước lên cây. Mọi góp ý, báo lỗi hay yêu cầu về nội dung đều gửi qua email dưới đây.
      </p>

      <h2>Email</h2>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>

      <h2>Bạn có thể liên hệ khi</h2>
      <ul>
        <li>
          <b>Muốn gỡ điều ước hoặc bình luận của mình.</b> Gửi kèm số điều ước (ví dụ #888) hoặc link trang
          điều ước. Nếu bạn đã đăng nhập khi viết, hãy gửi từ đúng địa chỉ email đó để chúng tôi xác nhận nhanh.
        </li>
        <li>
          <b>Thấy nội dung xấu.</b> Cách nhanh nhất là bấm nút <b>Báo cáo</b> ngay dưới điều ước hoặc bình
          luận (cần đăng nhập Google). Đủ ba người báo cáo, nội dung sẽ tự ẩn để người giữ cây xem lại.
        </li>
        <li>
          <b>Gặp lỗi</b> (trang không tải, cây bị giật trên điện thoại, không đăng nhập được…). Cho chúng tôi
          biết bạn dùng điện thoại/trình duyệt nào và chuyện gì đã xảy ra.
        </li>
        <li>
          <b>Góp ý, đề xuất tính năng</b> hoặc muốn dùng Cây Ước Nguyện cho hoạt động của lớp, câu lạc bộ, trường.
        </li>
      </ul>

      <h2>Xem thêm</h2>
      <p>
        <Link href="/gioi-thieu">Giới thiệu</Link> · <Link href="/chinh-sach-bao-mat">Chính sách bảo mật</Link> ·{' '}
        <Link href="/dieu-khoan">Điều khoản sử dụng</Link>
      </p>
    </LegalPage>
  )
}
