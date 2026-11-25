import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage, { CONTACT_EMAIL } from '@/components/ui/LegalPage'

export const metadata: Metadata = {
  title: 'Chính sách bảo mật — Cây Ước Nguyện',
  description: 'Cây Ước Nguyện thu thập dữ liệu gì, dùng vào việc gì và bạn có quyền gì với dữ liệu của mình.',
  alternates: { canonical: '/chinh-sach-bao-mat' },
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Chính sách bảo mật">
      <p>
        Cây Ước Nguyện (<b>cayuocnguyen.io.vn</b>) là một trang web phi lợi nhuận để mọi người viết và
        treo điều ước lên cây. Trang này giải thích chúng tôi thu thập những gì và dùng chúng ra sao.
      </p>

      <h2>1. Dữ liệu chúng tôi thu thập</h2>
      <ul>
        <li>
          <b>Điều ước bạn gửi:</b> nội dung, chủ đề, tên hiển thị bạn tự nhập (nếu có) và thời điểm gửi.
        </li>
        <li>
          <b>Khi bạn đăng nhập bằng Google:</b> chúng tôi nhận từ Google <b>tên, địa chỉ email, ảnh đại
          diện</b> và một mã định danh tài khoản. Tên được hiện kèm điều ước; mã định danh được lưu cùng
          điều ước để biết điều ước đó do người đã đăng nhập gửi. Chúng tôi <b>không</b> hiển thị email
          của bạn công khai và không truy cập bất kỳ dữ liệu nào khác trong tài khoản Google của bạn.
        </li>
        <li>
          <b>Phòng Rừng Trúc (ôn bài cùng nhau):</b> biệt danh bạn tự đặt và một mã ngẫu nhiên lưu trong
          trình duyệt, để người khác thấy bạn đang trong phòng.
        </li>
        <li>
          <b>Dữ liệu kỹ thuật:</b> địa chỉ IP được dùng tạm thời để chống spam (giới hạn số lần gửi) và
          không được lưu lâu dài; thống kê truy cập ẩn danh qua Vercel Analytics (không dùng cookie theo
          dõi).
        </li>
      </ul>

      <h2>2. Chúng tôi dùng dữ liệu để làm gì</h2>
      <ul>
        <li>Hiển thị điều ước lên cây và ở trang “Tất cả điều ước”.</li>
        <li>Duyệt nội dung, chặn spam và nội dung không phù hợp.</li>
        <li>Cho phép điều ước của người đã đăng nhập hiện ngay mà không cần chờ duyệt.</li>
      </ul>
      <p>Chúng tôi <b>không bán, không cho thuê</b> và không dùng dữ liệu của bạn cho quảng cáo.</p>

      <h2>3. Nơi lưu trữ và bên thứ ba</h2>
      <p>
        Dữ liệu được lưu trên <b>Google Firebase</b> (Firestore, Authentication); trang web được vận hành
        trên <b>Vercel</b>. Các dịch vụ này xử lý dữ liệu theo chính sách bảo mật của riêng họ.
      </p>

      <h2>4. Nội dung công khai</h2>
      <p>
        Điều ước sau khi được duyệt sẽ <b>hiển thị công khai</b> cho mọi người, kèm tên hiển thị (nếu có).
        Đừng viết thông tin cá nhân nhạy cảm (số điện thoại, địa chỉ…) vào điều ước.
      </p>

      <h2>5. Quyền của bạn</h2>
      <p>
        Bạn có thể yêu cầu <b>gỡ điều ước</b> hoặc <b>xoá dữ liệu</b> gắn với tài khoản của mình bất cứ
        lúc nào bằng cách gửi email tới{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Bạn cũng có thể thu hồi quyền truy cập
        của trang tại{' '}
        <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">
          myaccount.google.com/permissions
        </a>
        .
      </p>

      <h2>6. Trẻ em</h2>
      <p>
        Nếu bạn dưới 13 tuổi, hãy dùng trang cùng bố mẹ hoặc người giám hộ và không đăng nhập bằng tài
        khoản Google.
      </p>

      <h2>7. Thay đổi chính sách</h2>
      <p>
        Chúng tôi có thể cập nhật chính sách này; ngày cập nhật được ghi ở đầu trang. Xem thêm{' '}
        <Link href="/dieu-khoan">Điều khoản sử dụng</Link>.
      </p>
    </LegalPage>
  )
}
