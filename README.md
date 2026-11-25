# 🌳 Cây Ước Nguyện

Trang chủ là một **cây 3D** treo những tờ giấy đỏ ghi điều ước. Người dùng chạm vào tờ giấy lấp lánh để đọc, hoặc viết điều ước của riêng mình treo lên cây. Có hiệu ứng gió và **đổi cảnh theo thời tiết thật của Hà Nội**.

Xây bằng **Next.js (App Router) + React Three Fiber + Firebase Firestore**.

## Tính năng

- **Màn chờ**: chữ "Cây Ước Nguyện" thư pháp trên nền giấy dó, **đèn trời** lững lờ bay lên; tải xong thì **màu nước loang** (shader WebGL) mở dần ra cây 3D.
- Cây 3D low-poly, giấy/hoa dùng `InstancedMesh` (nhẹ trên mobile).
- Click tờ giấy → đọc điều ước (raycast theo `instanceId`).
- Viết điều ước → lọc từ tục + rate-limit. **Đăng nhập Google → điều ước hiện NGAY trên cây** (khỏi chờ duyệt); gửi ẩn danh → vào hàng chờ **duyệt** rồi mới hiện.
- Dưới tiêu đề có huy hiệu **số điều ước trên cây + số đang chờ duyệt** (cập nhật mỗi phút, `/api/wishes/stats`); gửi ẩn danh sẽ được báo vị trí trong hàng chờ.
- **Tất cả ước nguyện** (`/dieu-uoc`): xem mọi điều ước đã đăng, **lọc theo chủ đề** và **phân trang** (phân trang xử lý ở server).
- Thời tiết Hà Nội qua Open-Meteo (đổi trời/ánh sáng/mưa/đêm); gió theo tốc độ gió thật.
- Điều khiển camera orbit + pinch tự viết; tự xoay nhẹ khi rảnh.
- **Menu dock** (góc dưới-phải): bấm để chuyển nhanh giữa Cây · Viết điều ước · Phòng ôn bài · **Kỹ năng sống** · **Tất cả ước nguyện**.
- **Kỹ năng sống** (`/ky-nang`): trang dạy kỹ năng cơ bản cho học sinh theo 4 nhóm — **nấu nướng** (nấu cơm, luộc rau, mì trứng, an toàn bếp…), **trồng trọt** (rau mầm, giá đỗ, hành lá, rau ban công…), **chụp ảnh** (bố cục 1/3, ánh sáng, chụp điện thoại…) và **chăm sóc da** (rửa mặt, chống nắng, da mụn…). Mỗi bài có ảnh minh hoạ (Wikimedia Commons) + nguồn tham khảo uy tín (Wikipedia, không quảng cáo). Sửa nội dung ở `lib/skills.ts`.
- **Thiền viện → phòng Rừng Trúc**: chạm thiền viện trên đỉnh núi xa để vào một cảnh rừng trúc 3D, cùng nhau ôn bài/làm việc. Thấy nhau qua avatar người thiền, **đồng hồ phiên** hiện trên đầu; có **đồng hồ flip** và **hẹn giờ Pomodoro** (25/5, 50/10). Presence realtime ẩn danh (không cần đăng nhập).

## Bắt đầu

```bash
npm install
cp .env.local.example .env.local   # điền cấu hình Firebase (xem bên dưới)
npm run dev                        # http://localhost:3000
```

> Chưa cấu hình Firebase vẫn chạy được: cây hiển thị **8 điều ước mẫu**, nút "Viết điều ước" sẽ báo máy chủ chưa cấu hình lưu trữ.

## Cấu hình Firebase

1. Tạo project tại [Firebase Console](https://console.firebase.google.com), bật **Firestore**.
2. Lấy config web app → điền các biến `NEXT_PUBLIC_FIREBASE_*`.
3. Vào *Project settings > Service accounts > Generate new private key* → điền `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
4. (Tuỳ chọn) `ADMIN_EMAILS` — email Google được vào `/admin` (phân tách dấu phẩy; mặc định `khuctruonghuy2000@gmail.com`). `ADMIN_SECRET` vẫn dùng được làm mã dự phòng cho API.
5. Triển khai security rules: nội dung trong `firestore.rules` (client đọc bản `approved` của `wishes` + đọc `sessions`; mọi ghi qua Admin SDK).
6. **Index cho trang "Tất cả ước nguyện"**: deploy `firestore.indexes.json` bằng `firebase deploy --only firestore:indexes`, **hoặc** mở `/dieu-uoc` lần đầu rồi bấm link tạo index mà Firestore báo trong log server.

## Đăng nhập (tự đăng ngay, khỏi chờ duyệt)

Trong Firebase Console > **Authentication > Sign-in method**:

- Bật **Google**.
- (Tạm ẩn nút Facebook trong `Composer` vì provider chưa bật — muốn mở lại thì bật provider rồi thêm lại nút.) Bật **Facebook**: tạo một Facebook Developer App, dán **App ID** + **App secret** vào Console, rồi copy **OAuth redirect URI** mà Firebase hiển thị vào phần *Valid OAuth Redirect URIs* của Facebook App.
- **Authentication > Settings > Authorized domains**: thêm `localhost` và domain Vercel của bạn (nếu thiếu, đăng nhập báo `auth/unauthorized-domain`).

Không cần biến env mới — đăng nhập dùng lại config Firebase sẵn có; server xác minh ID token bằng Admin SDK trước khi cho điều ước hiện ngay.

## Duyệt điều ước (cho người gửi ẩn danh)

- Truy cập `/admin` → **Đăng nhập với Google** bằng email admin (trong `ADMIN_EMAILS`) là vào thẳng.
- Tab **Chờ duyệt / Đã duyệt / Đã bỏ / Tất cả** (kèm số lượng, phân trang 20/trang): xem lại mọi điều ước, ai gửi, lúc nào, ai duyệt.
- Nút **Duyệt** · **Bỏ** / **Gỡ khỏi cây** · **Đưa về chờ duyệt**. Điều ước của người đã đăng nhập tự duyệt (nhãn "đăng nhập · tự duyệt") nhưng vẫn gỡ được.

## Cấu trúc

- `components/three/*` — các phần của scene 3D (Tree, DecorPapers, WishPapers, Petals, Rain, CameraRig, SceneEnv…).
- `components/ui/*` — lớp giao diện (huy hiệu thời tiết, thẻ đọc, bảng viết, toast, loader).
- `lib/*` — themes, tree (hình học + anchor tất định), weather, profanity, firebase, wishes, **auth** (đăng nhập Google/Facebook).
- `app/api/*` — proxy thời tiết, POST điều ước, **GET danh sách phân trang** (`wishes/list`), duyệt (admin).
- `app/dieu-uoc/*` — trang "Tất cả ước nguyện" (lọc + phân trang, không Canvas).
- `app/gioi-thieu` — trang Giới thiệu (home page khai báo cho Google OAuth consent screen).
- `app/chinh-sach-bao-mat`, `app/dieu-khoan` — Chính sách bảo mật & Điều khoản (dùng cho Google OAuth consent screen; email liên hệ ở `components/ui/LegalPage.tsx`). Có link nhỏ dưới nút đăng nhập trong `Composer`.
- `store/useScene.ts` — state (Zustand).

## Mô hình dữ liệu (collection `wishes`)

```ts
{ text, theme, author?, uid?, status: 'pending'|'approved'|'rejected', createdAt }
```

`uid` có khi điều ước được gửi bởi người đã đăng nhập (→ tự `approved`).

Mỗi `theme` là một "zone" treo trên cây; vị trí từng tờ là **tất định** theo id (không nhảy giữa các lần load).
