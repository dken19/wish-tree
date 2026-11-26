# 🌳 Cây Ước Nguyện

Trang chủ là một **cây 3D** treo những tờ giấy đỏ ghi điều ước. Người dùng chạm vào tờ giấy lấp lánh để đọc, hoặc viết điều ước của riêng mình treo lên cây. Có hiệu ứng gió và **đổi cảnh theo thời tiết thật của Hà Nội**.

Xây bằng **Next.js (App Router) + React Three Fiber + Firebase Firestore**.

## Tính năng

- **Màn chờ**: chữ "Cây Ước Nguyện" thư pháp trên nền giấy dó, **đèn trời** lững lờ bay lên; tải xong thì **màu nước loang** (shader WebGL) mở dần ra cây 3D.
- Cây 3D low-poly, giấy/hoa dùng `InstancedMesh` (nhẹ trên mobile).
- Click tờ giấy → đọc điều ước (raycast theo `instanceId`).
- Viết điều ước → lọc từ tục + rate-limit. **Đăng nhập Google → điều ước hiện NGAY trên cây** (khỏi chờ duyệt) và **thẻ ước lấp lánh** kèm tên người gửi viết thư pháp (không kèm ảnh); gửi ẩn danh → vào hàng chờ **duyệt** rồi mới hiện.
- Dưới tiêu đề có huy hiệu **số điều ước trên cây + số đang chờ duyệt** (cập nhật mỗi phút, `/api/wishes/stats`); gửi ẩn danh sẽ được báo vị trí trong hàng chờ.
- Mỗi điều ước có **số thứ tự** (`#1`, `#888`…) và **ngày giờ gửi**; gửi xong được báo số của mình.
- **Tài khoản / Điều ước của tôi** (`/tai-khoan`, nút **hình người** cạnh huy hiệu giờ ở trang chủ, hoặc mục trong cuộn bí kíp): đăng nhập Google → xem mọi điều ước mình đã treo (kể cả chờ duyệt / không lên cây) và tự đánh dấu **Đang cố gắng** / **Đã đạt được**; điều ước đã đạt hiện dấu "Đã đạt" công khai trên cây và `/dieu-uoc`. Ước gửi ẩn danh không gắn tài khoản nên không hiện ở đây.
- **Trang riêng cho từng điều ước** (`/dieu-uoc/888`): nút **Sao chép link** / Chia sẻ / Facebook; dán link vào Zalo, Messenger, Facebook, X… sẽ hiện **ảnh xem trước riêng** của điều ước. Điều ước của người đăng nhập có trang lấp lánh, chữ thư pháp và chủ nhân **chọn được giao diện** (Giấy đỏ, Trăng đêm, Hoa đào, Ngọc bích, Hoàng kim).
- **Tất cả ước nguyện** (`/dieu-uoc`): **tìm theo số `#888` hoặc từ khoá** (không cần gõ dấu), lọc theo **chủ đề** / **ngày gửi**, sắp xếp mới/cũ nhất, **phân trang** ở server.
- **Góc xàm xí** (`/xam-xi`): điều ước vui vui không treo lên cây; admin chọn bằng nút **Xàm xí…** trong `/admin` và ghi lí do không duyệt (hiện công khai, giấu tên người viết). Có thể **gộp 2–6 tờ liên quan thành một bộ** dùng **chung một lí do** (chọn được tờ ở mọi tab, tạo bộ là tờ tự sang Xàm xí; lí do riêng từng tờ không bắt buộc; tờ đã vào bộ chỉ hiện ở tab Bộ sưu tập, không lặp ở Từng tờ) — tab **Bộ sưu tập** ở `/xam-xi`.
- **Bình luận & báo cáo** (cần đăng nhập Google): bình luận động viên dưới mỗi điều ước (trên cây hoặc `/dieu-uoc`); tài khoản admin bình luận dưới tên **"Người giữ cây"** (đổi bằng env `ADMIN_DISPLAY_NAME`) kèm dấu triện + nhãn "Giữ cây"; báo cáo điều ước/bình luận xấu — đủ 3 tài khoản báo cáo thì tự ẩn chờ admin xem ở tab **⚑ Bị báo cáo** trong `/admin`.
- Trời trên cây: ngày/đêm theo giờ Việt Nam, ban ngày nắng/mây/mưa ngẫu nhiên (đổi sau 15 phút); huy hiệu góc phải hiện giờ Hà Nội.
- Trang nội dung (Tất cả điều ước, Kỹ năng sống, Giới thiệu, pháp lý, admin): nền trời đèn trời đổi theo 4 mốc giờ VN (bình minh/trưa/hoàng hôn/đêm; xem thử bằng `?sky=dawn|day|dusk|night`), mỗi điều ước là một tấm vé có số #N + giờ gửi; đầu trang hiện số điều ước đang treo + đang chờ duyệt.
- Điều khiển camera orbit + pinch tự viết; tự xoay nhẹ khi rảnh.
- **Menu dock** (góc dưới-phải): bấm để chuyển nhanh giữa Cây · Viết điều ước · Phòng ôn bài · **Kỹ năng sống** · **Tất cả ước nguyện** · **Góc xàm xí**.
- **Kỹ năng sống** (`/ky-nang`): trang dạy kỹ năng cơ bản cho học sinh theo 4 nhóm — **nấu nướng** (nấu cơm, luộc rau, mì trứng, an toàn bếp…), **trồng trọt** (rau mầm, giá đỗ, hành lá, rau ban công…), **chụp ảnh** (bố cục 1/3, ánh sáng, chụp điện thoại…) và **chăm sóc da** (rửa mặt, chống nắng, da mụn…). Mỗi bài có ảnh minh hoạ (Wikimedia Commons) + nguồn tham khảo uy tín (Wikipedia, không quảng cáo). Sửa nội dung ở `lib/skills.ts`.
- **Thiền viện → phòng Rừng Trúc**: chạm thiền viện trên đỉnh núi xa để vào một cảnh rừng trúc 3D, cùng nhau ôn bài/làm việc. Thấy nhau qua avatar người thiền, **đồng hồ phiên** hiện trên đầu; có **đồng hồ flip** và **hẹn giờ Pomodoro** (25/5, 50/10). Presence realtime ẩn danh (không cần đăng nhập). Phòng là **một map để đi dạo**: chạm xuống đất (máy tính: WASD/mũi tên) cho nhân vật đi; có ao sen, rừng trúc, bụi cây (asset CC0 Poly Haven). Cảnh cây ước dùng đất cỏ, vỏ cây và đá scan từ Poly Haven (CC0); cỏ phủ kín đồi, có đèn đá cạnh gốc cây rọi sáng khi trời tối. **Bàn thờ đá**: đi tới tượng, **vái 3 lần** để nhận một lời chúc trong ngày và hiệu ứng "được chúc phúc" 60 phút (hạt sáng vàng quanh nhân vật).

## Cho AI agent / trợ lý AI

- `/llms.txt` (mục lục + **khi nào nên giới thiệu** trang này) và `/llms-full.txt` (bản đầy đủ) — sinh từ `lib/agentContent.ts`.
- Mọi trang trả **Markdown** khi gửi `Accept: text/markdown` (vd `curl -H 'Accept: text/markdown' https://cayuocnguyen.io.vn/dieu-uoc/1`), 404 cũng là Markdown.
- JSON-LD WebSite + Organization + WebApplication ở mọi trang, CreativeWork ở trang điều ước; trang Liên hệ `/lien-he`; `/about` `/contact` `/privacy` `/terms` chuyển về trang tiếng Việt.
- Kiểm tra mức sẵn sàng: `npx is-agentic cayuocnguyen.io.vn`.

## Bắt đầu

```bash
nvm use                            # Node 24 LTS (xem .nvmrc)
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
6. **Index cho trang "Tất cả ước nguyện"**: deploy `firestore.indexes.json` bằng `firebase deploy --only firestore:indexes --project <project-id>` (thêm `--account <email>` nếu CLI đăng nhập nhiều tài khoản), **hoặc** mở `/dieu-uoc` lần đầu rồi bấm link tạo index mà Firestore báo trong log server.

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
- `components/ui/*` — lớp giao diện (huy hiệu giờ + thời tiết, thẻ đọc, bảng viết, toast, loader, `PageShell` khung trang nội dung, `Icon` icon SVG).
- `lib/*` — themes, tree (hình học + anchor tất định), weather, profanity, firebase, wishes, **auth** (đăng nhập Google/Facebook).
- `app/api/*` — POST điều ước, bình luận, báo cáo, số điều ước (`wishes/stats`), **GET danh sách phân trang** (`wishes/list`), duyệt (admin).
- `app/dieu-uoc/*` — trang "Tất cả ước nguyện" (lọc + phân trang, không Canvas).
- `app/tai-khoan/*` — "Điều ước của tôi" (đăng nhập, đánh dấu tiến độ, không Canvas); API `app/api/me/wishes`.
- `app/xam-xi/*` — trang "Góc xàm xí" (điều ước status `funny` + lí do không duyệt).
- `app/gioi-thieu` — trang Giới thiệu (home page khai báo cho Google OAuth consent screen).
- `app/chinh-sach-bao-mat`, `app/dieu-khoan` — Chính sách bảo mật & Điều khoản (dùng cho Google OAuth consent screen; email liên hệ ở `components/ui/LegalPage.tsx`). Có link nhỏ dưới nút đăng nhập trong `Composer`.
- `store/useScene.ts` — state (Zustand).

## Mô hình dữ liệu (collection `wishes`)

```ts
{ text, theme, author?, uid?, status: 'pending'|'approved'|'rejected', createdAt }
```

`uid` có khi điều ước được gửi bởi người đã đăng nhập (→ tự `approved`). `progress` (`trying`|`achieved`) + `achievedAt`: chính người viết tự đánh dấu ở `/tai-khoan`.

Mỗi `theme` là một "zone" treo trên cây; vị trí từng tờ là **tất định** theo id (không nhảy giữa các lần load).
