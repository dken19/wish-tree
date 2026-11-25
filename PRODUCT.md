# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Người Việt ở mọi lứa tuổi muốn thả một điều ước, phần lớn vào bằng điện thoại. Học sinh mùa thi là một nhóm lớn nhưng không phải duy nhất. Họ vào để viết một điều ước, đọc điều ước của người khác, động viên nhau, hoặc ngồi học cùng người lạ trong phòng ôn bài.

## Product Purpose

Cây Ước Nguyện (cayuocnguyen.io.vn) là trang web miễn phí, phi lợi nhuận: viết điều ước lên tờ giấy đỏ và treo lên một cây 3D, đọc điều ước của mọi người. Thành công là khi người ta treo được điều ước của mình, thấy nó trên cây, và đọc thấy điều ước của người khác đủ để thấy mình không một mình.

## Positioning

- Phong tục treo điều ước của người Việt: giấy đỏ, thư pháp, chim Lạc, đèn trời. Không phải thiệp chúc kiểu phương Tây.
- Cây 3D sống theo thời tiết Hà Nội thật (gió, mưa, ngày/đêm); điều ước hiện lên cây ngay khi được đăng.
- Cộng đồng ẩn danh mà an toàn: viết ước không cần tài khoản; có lọc từ, duyệt tay cho ước ẩn danh, bình luận và báo cáo dành cho người đăng nhập Google.
- Góc học tập đi kèm: phòng ôn bài Rừng Trúc (Pomodoro, thấy nhau qua avatar) và trang Kỹ năng sống.

## Operating Context

- Trang chủ là cảnh 3D (React Three Fiber) với bàn thư pháp để viết ước và menu dock để chuyển cảnh.
- Các trang nội dung không mount Canvas: `/dieu-uoc` (tìm, lọc, đọc, bình luận điều ước), `/ky-nang`, `/gioi-thieu`, `/chinh-sach-bao-mat`, `/dieu-khoan`.
- Mỗi điều ước có số thứ tự `#N` và giờ gửi; giờ hiển thị theo giờ Việt Nam.
- Quản trị duyệt ước và xử lý báo cáo ở `/admin`.

## Capabilities and Constraints

- Không được lag trên điện thoại yếu: hiệu ứng chạy CSS/GPU nhẹ, giảm số lượng trên mobile, tôn trọng `prefers-reduced-motion`.
- Tiếng Việt đủ dấu, dễ đọc; giọng thân thiện, không màu mè.
- Next.js 16 + React 19 + Firebase (Firestore, Auth); deploy Vercel; Node 24.

## Brand Commitments

- Tên app "Cây Ước Nguyện", tiêu đề viết thư pháp (Dancing Script). Tên trên trang `/gioi-thieu` phải khớp tên đăng ký Google OAuth.
- Giấy ước màu đỏ, chim Lạc Đông Sơn (`public/chim-lac.jpg`), logo `public/logo.png`.
- Các trang nội dung có nền đèn trời đổi theo 4 mốc giờ Việt Nam (bình minh, trưa, hoàng hôn, đêm tối) — người dùng chỉ định.
- Người dùng muốn giao diện không mang dấu hiệu "AI slop" (card đổ bóng giống nhau, gradient trang trí, emoji làm icon).

## Evidence on Hand

- Điều ước thật của người dùng trong Firestore; 8 điều ước mẫu (`lib/wishes.ts`) khi chưa cấu hình.
- Nội dung kỹ năng sống có ảnh Wikimedia Commons và nguồn Wikipedia (`lib/skills.ts`).
- Không có số liệu người dùng, lời chứng thực hay báo chí; không được bịa.

## Product Principles

1. Điều ước của người dùng là nội dung chính; giao diện lùi lại để chữ được đọc.
2. Chất Việt đến từ phong tục thật (giấy đỏ, thư pháp, đèn trời), không từ hoạ tiết dán thêm.
3. Ẩn danh vẫn phải an toàn: mọi tính năng cộng đồng đi kèm cách kiểm soát nội dung xấu.
4. Nhẹ trước, đẹp sau: không hiệu ứng nào được làm chậm điện thoại yếu.

## Accessibility & Inclusion

- Trang pháp lý (`/gioi-thieu`, bảo mật, điều khoản) phải rõ ràng, dễ đọc cho người duyệt Google.
- Tôn trọng giảm chuyển động; tương phản đủ đọc trên nền trời ở mọi mốc giờ.
