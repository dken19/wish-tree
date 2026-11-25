import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage, { CONTACT_EMAIL } from '@/components/ui/LegalPage'

export const metadata: Metadata = {
  title: 'Điều khoản sử dụng — Cây Ước Nguyện',
  description: 'Quy tắc khi viết điều ước và sử dụng Cây Ước Nguyện.',
  alternates: { canonical: '/dieu-khoan' },
}

export default function TermsPage() {
  return (
    <LegalPage title="Điều khoản sử dụng">
      <p>
        Khi dùng Cây Ước Nguyện (<b>cayuocnguyen.io.vn</b>), bạn đồng ý với các điều khoản dưới đây.
      </p>

      <h2>1. Dịch vụ</h2>
      <p>
        Trang cho phép bạn viết điều ước, treo lên cây 3D, đọc điều ước của người khác và ôn bài cùng mọi
        người. Dịch vụ miễn phí, được cung cấp “nguyên trạng” và có thể thay đổi hoặc tạm dừng bất cứ lúc
        nào.
      </p>

      <h2>2. Nội dung bạn viết</h2>
      <ul>
        <li>Bạn chịu trách nhiệm về điều ước mình gửi.</li>
        <li>
          Không viết nội dung tục tĩu, xúc phạm, quấy rối, phân biệt đối xử, vi phạm pháp luật, quảng cáo
          hoặc thông tin cá nhân của người khác.
        </li>
        <li>
          Bạn cho phép trang hiển thị công khai điều ước của mình (kèm tên hiển thị nếu có) trên cây và ở
          trang “Tất cả điều ước”.
        </li>
      </ul>

      <h2>3. Kiểm duyệt</h2>
      <p>
        Chúng tôi có quyền duyệt, từ chối hoặc gỡ bất kỳ điều ước nào — kể cả điều ước của người đã đăng
        nhập — mà không cần báo trước, và có thể chặn tài khoản hoặc địa chỉ IP vi phạm.
      </p>

      <h2>4. Tài khoản</h2>
      <p>
        Đăng nhập bằng Google là không bắt buộc. Khi đăng nhập, điều ước của bạn được hiện ngay; bạn vẫn
        phải tuân thủ các quy tắc ở mục 2.
      </p>

      <h2>5. Giới hạn trách nhiệm</h2>
      <p>
        Cây Ước Nguyện không chịu trách nhiệm về nội dung do người dùng viết, cũng như việc dịch vụ gián
        đoạn hoặc mất dữ liệu.
      </p>

      <h2>6. Liên hệ</h2>
      <p>
        Mọi câu hỏi hoặc yêu cầu gỡ nội dung, vui lòng gửi tới{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Xem thêm{' '}
        <Link href="/chinh-sach-bao-mat">Chính sách bảo mật</Link>.
      </p>
    </LegalPage>
  )
}
