<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Cây Ước Nguyện — bản đồ dự án nhanh

Trang chủ là **cây 3D treo điều ước (giấy đỏ)**, có gió + trời ngày/đêm theo giờ VN (nắng/mây/mưa random, không nút chuyển), đồng cỏ/bướm/chuồn chuồn/sương, bàn thư pháp để viết điều ước, hoạ tiết chim Lạc. Người dùng gửi điều ước → lọc từ → **người đăng nhập Google hiện NGAY (auto-approve) + thẻ ước lấp lánh** (`verified` từ `uid`, `components/ui/Sparkles`) (nút Facebook tạm ẩn), người ẩn danh vào hàng chờ duyệt tay → hiện realtime trên cây. Mỗi điều ước có **số #N** (cấp lúc gửi, `meta/counters`) + giờ gửi; `/dieu-uoc` tìm theo #số/từ khoá (`keywords` bỏ dấu)/ngày; **bình luận + báo cáo + thả cảm xúc (tim / cỏ bốn lá / sao, `/api/reactions`, `components/ui/Reactions`) chỉ cho người đăng nhập**; admin có tab **Người dùng** (`/api/admin/users`: khoá/mở khoá qua Auth `disabled`, gỡ hết điều ước; đường ghi verify strict) (`/api/wishes/[id]/comments`, `/api/reports`, đủ 3 báo cáo → tự ẩn, admin xử lý tab "Bị báo cáo"). Đăng nhập qua Firebase Auth (`lib/auth.ts` + `AuthBridge` ghi `useScene.user`); server `/api/wishes` `verifyIdToken` mới đặt `approved` (KHÔNG tin client). Có **menu dock** (góc dưới-phải, `NavDock`) chuyển nhanh: Cây · Viết · Phòng ôn bài (đổi state, giữ 1 Canvas) · **Kỹ năng sống** (route `/ky-nang`, dữ liệu `lib/skills.ts`) — nấu nướng/trồng trọt/chụp ảnh/chăm sóc da, ảnh Wikimedia + nguồn Wikipedia · **Góc xàm xí** (route `/xam-xi`, điều ước admin đánh dấu `status:'funny'` + `funnyNote` lí do không duyệt, giấu tên; gộp 2–6 tờ thành "bộ" ở collection `funnyCollections`) · **Điều ước của tôi** (route `/tai-khoan`, cũng mở từ nút **hình người** `AccountButton` cạnh huy hiệu giờ): người đăng nhập xem ước của mình + tự đánh dấu `progress` **Đang cố gắng / Đã đạt được** (`/api/me/wishes`, chỉ chủ uid sửa; dấu "Đã đạt" hiện công khai) + **đính kèm 1 ảnh vào điều ước** (chỉ người đăng nhập, `lib/imageServer` nén WebP ≤1280px → Storage, `components/ui/WishPhoto`) + **đổi tên / ảnh đại diện** (`/api/me/profile`, ảnh nén WebP bằng sharp → Firebase Storage) + chọn **Công khai / Riêng tư** (`status:'private'` + `shareKey`, chỉ mở qua `/dieu-uoc/rieng/<key>`) · **Trang chi tiết** `/dieu-uoc/[no]` (ISR, metadata OG/Twitter + ảnh OG riêng mỗi ước; nút sao chép link/chia sẻ; ước người đăng nhập đẹp hơn + chủ nhân chọn **skin** `lib/wishSkins` + **khung** `lib/wishFrames`/`WishFrame`) · **Tất cả ước nguyện** (route `/dieu-uoc` — danh sách ước đã đăng, **phân trang ở server** `/api/wishes/list` + lọc theo chủ đề); cả hai route này (và giới thiệu/pháp lý/admin) KHÔNG mount Canvas, dùng `PageShell` + `app/pages.css` (trời đèn trời 4 mốc giờ VN, điều ước dạng vé số #N). **Không dùng emoji làm icon** — dùng `components/ui/Icon.tsx` (định hướng thiết kế: `PRODUCT.md`, skill Impeccable).

Còn có **thiền viện trên đỉnh núi xa** → bấm mở **phòng Rừng Trúc** (đổi cảnh trong CÙNG Canvas theo `roomOpen`): cùng ôn bài/làm việc, thấy nhau qua **avatar người chibi ngồi thiền** (`Meditators`) (đồng hồ phiên hiện trên đầu), phòng là **map đi dạo** (nhân vật của mình đi bằng chạm đất/WASD, va chạm tròn `lib/roomMap`, trạng thái `player` ở `lib/runtime` không re-render; vị trí chỉ ở client) có ao sen + **bàn thờ đá: vái 3 lần → 1 lời chúc/ngày + buff 60 phút** (`lib/blessings`, localStorage), có **Pomodoro hiển thị bằng số flip** (giờ Hà Nội là dòng nhỏ; huy hiệu thời tiết ẩn khi ở trong phòng). Presence realtime ẩn danh (clientId + nickname ở localStorage, KHÔNG Auth) qua Firestore `sessions` — **đường ghi Firestore MỚI**: client heartbeat → `/api/presence` (Admin SDK), client đọc `onSnapshot` + lọc staleness; đồng hồ phiên tính ở client từ `joinedAt` (0 ghi/giây).

**Stack:** Node.js **24 LTS** (`engines` trong package.json → Vercel dùng đúng bản; `.nvmrc`; CI `node-version: '24'`) · Next.js 16.4 (App Router, Turbopack) · React 19 · React Three Fiber v9 + drei + three 0.184 · Zustand · Firebase (client đọc Firestore, Admin SDK ghi/duyệt) · next/font · Vercel Analytics (`<Analytics />` ở `app/layout.tsx`).

**Nguyên tắc cốt lõi: KHÔNG được lag trên mobile.** Gió cỏ chạy GPU (vertex shader), mọi thứ instanced, số lượng giảm theo `useIsMobile()`, có `AdaptiveDpr`.

**Bám đất ("trọng lực" nhẹ):** vật đặt trên đất lấy Y từ `groundHeight(x,z)` (KHÔNG hardcode `y=0`), vật trên sườn nghiêng theo `slopeQuaternion(x,z,blend)` (`lib/terrain`); tính **1 lần lúc dựng cảnh** (bake vào instance), KHÔNG mỗi frame, KHÔNG dùng engine vật lí thật.

👉 **Đọc [ARCHITECTURE.md](ARCHITECTURE.md) để hiểu đầy đủ cấu trúc, luồng dữ liệu, và các "gotcha" trước khi sửa code.**

## ⚠️ QUY ƯỚC BẮT BUỘC: làm xong → cập nhật docs

**Mỗi khi hoàn thành một thay đổi, PHẢI cập nhật tài liệu tương ứng trong cùng lần làm đó** (đừng để docs lệch với code):
- Thêm/xoá/đổi tên file, component, route, lib → cập nhật **cây thư mục** trong `ARCHITECTURE.md`.
- Đổi luồng dữ liệu (điều ước/thời tiết/gió), mô hình Firestore, hoặc biến môi trường → cập nhật mục tương ứng trong `ARCHITECTURE.md`.
- Thêm "gotcha" mới (quirk, workaround, rule eslint tắt, mẹo hiệu năng) → thêm vào mục **Gotchas** của `ARCHITECTURE.md`.
- Đổi tính năng người dùng / cách chạy / deploy → cập nhật `README.md`.
- Đổi stack, lệnh, hoặc nguyên tắc lớn → cập nhật phần tóm tắt trong `AGENTS.md` này.

- Đổi tính năng người dùng / thêm trang công khai → cập nhật luôn **`lib/agentContent.ts`** (nguồn của `/llms.txt`, `/llms-full.txt`, bản Markdown cho AI agent qua `proxy.ts`).

Giữ docs ngắn gọn, đúng hiện trạng. Coi việc cập nhật docs là **một phần của Definition of Done**, không phải việc làm thêm.

Lệnh: `npm run dev` (cổng 3000) · `npm run build` · `npm run lint` · `npm run seed` (seed Firestore) · `npm run seed:mau` (ước mẫu Xuân Phong có ảnh). Cấu hình ở `.env.local` (mẫu: `.env.local.example`). Deploy: push `master` → Vercel tự deploy; CI ở `.github/workflows/ci.yml`.
