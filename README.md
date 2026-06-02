# 🌳 Cây Ước Nguyện

Trang chủ là một **cây 3D** treo những tờ giấy đỏ ghi điều ước. Người dùng chạm vào tờ giấy lấp lánh để đọc, hoặc viết điều ước của riêng mình treo lên cây. Có hiệu ứng gió và **đổi cảnh theo thời tiết thật của Hà Nội**.

Xây bằng **Next.js (App Router) + React Three Fiber + Firebase Firestore**.

## Tính năng

- Cây 3D low-poly, giấy/hoa dùng `InstancedMesh` (nhẹ trên mobile).
- Click tờ giấy → đọc điều ước (raycast theo `instanceId`).
- Viết điều ước → lọc từ tục + rate-limit → vào hàng chờ **duyệt** → hiện realtime trên cây.
- Thời tiết Hà Nội qua Open-Meteo (đổi trời/ánh sáng/mưa/đêm); gió theo tốc độ gió thật.
- Điều khiển camera orbit + pinch tự viết; tự xoay nhẹ khi rảnh.

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
4. Đặt `ADMIN_SECRET` (mã đăng nhập trang duyệt).
5. Triển khai security rules: nội dung trong `firestore.rules` (client chỉ đọc bản `approved`).

## Duyệt điều ước

- Truy cập `/admin`, nhập `ADMIN_SECRET`.
- Danh sách điều ước đang chờ → **Duyệt** (hiện lên cây) hoặc **Bỏ**.

## Cấu trúc

- `components/three/*` — các phần của scene 3D (Tree, DecorPapers, WishPapers, Petals, Rain, CameraRig, SceneEnv…).
- `components/ui/*` — lớp giao diện (huy hiệu thời tiết, thẻ đọc, bảng viết, toast, loader).
- `lib/*` — themes, tree (hình học + anchor tất định), weather, profanity, firebase, wishes.
- `app/api/*` — proxy thời tiết, POST điều ước, duyệt (admin).
- `store/useScene.ts` — state (Zustand).

## Mô hình dữ liệu (collection `wishes`)

```ts
{ text, theme, author?, status: 'pending'|'approved'|'rejected', createdAt }
```

Mỗi `theme` là một "zone" treo trên cây; vị trí từng tờ là **tất định** theo id (không nhảy giữa các lần load).
