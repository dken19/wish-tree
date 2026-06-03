# Kiến trúc — Cây Ước Nguyện

Tài liệu này giúp **phiên làm việc sau (người hoặc AI)** hiểu nhanh toàn bộ dự án trước khi sửa code.

## 1. Tổng quan

Website một trang: **cây 3D treo những tờ giấy điều ước**, có gió + thời tiết Hà Nội theo thời gian thực, cảnh nền thung lũng (đồi/núi/rừng/xóm nhà), đồng cỏ + cỏ lau + hoa vàng đung đưa, bướm/chuồn chuồn, giọt sương, và một **bàn thư pháp** để viết điều ước. Hoạ tiết **chim Lạc (Đông Sơn)** ở khung viết.

Luồng người dùng: chạm tờ giấy → đọc điều ước · chạm bàn thư pháp → mở khung viết → gửi → **lọc từ tục + hàng chờ duyệt** → admin duyệt ở `/admin` → điều ước hiện **realtime** trên cây.

## 2. Stack & phiên bản (KHÁC training data — đọc kỹ)

- **Next.js 16** (App Router, **Turbopack**), **React 19**, TypeScript
- **@react-three/fiber v9** + **@react-three/drei v10** + **three 0.184**
  - three 0.184: dùng `THREE.SRGBColorSpace` (KHÔNG phải `sRGBEncoding`), `gl.outputColorSpace`.
- **zustand v5** — state UI/scene
- **firebase v12** (client SDK đọc) + **firebase-admin v13** (server ghi/duyệt)
- **next/font** (Be Vietnam Pro = body, Playfair = phụ, **Dancing Script** = thư pháp tiêu đề/điều ước)

> Cây Canvas được nạp bằng `dynamic(() => import('./WishTreeCanvas'), { ssr: false })` trong **HomeClient.tsx** (client component) vì Three.js cần `window`.

## 3. Cây thư mục

```
app/
  layout.tsx           # fonts (next/font), metadata, viewport; class font lên <html>
  page.tsx             # server: chỉ render <HomeClient/>
  globals.css          # toàn bộ CSS (port từ prototype) + style chim Lạc, khung viết
  admin/page.tsx       # client: trang duyệt (nhập ADMIN_SECRET, list pending, Duyệt/Bỏ)
  api/
    weather/route.ts   # GET: proxy Open-Meteo (Hà Nội), cache 10'
    wishes/route.ts    # POST: validate+lọc từ+rate-limit -> ghi pending (Admin SDK)
    admin/wishes/route.ts # GET list pending / PATCH duyệt|từ chối (header x-admin-secret)
components/
  HomeClient.tsx       # 'use client'; dynamic import Canvas + lớp UI overlay
  WishTreeCanvas.tsx   # <Canvas> R3F: dpr cap, antialias theo mobile, lắp mọi thành phần 3D
  DataBridge.tsx       # render rỗng: subscribe điều ước + fetch thời tiết -> đẩy vào store
  three/
    Tree.tsx           # thân+rễ+cành cổ thụ: ống cong bezier (a->bend->b) thuôn, gộp 1 mesh
    Ground.tsx         # nền (đỉnh núi: mặt cỏ đa giác + vách đá thuôn) + gò + bóng đổ giả
    Scenery.tsx        # cảnh nền bao quanh: đồi/núi xa, rừng thông (instanced), xóm nhà — tĩnh
    Meadow.tsx         # cỏ + cỏ lau (thân+bông) gió GPU + hoa vàng (points)
    Blossoms.tsx       # hoa trên tán = point sprite mềm (texture canvas), bob theo gió
    DecorPapers.tsx    # giấy đỏ trang trí (InstancedMesh) đung đưa — KHÔNG click
    WishPapers.tsx     # điều ước đã duyệt (InstancedMesh) — CLICK đọc; dây nối cành
    CalligraphyDesk.tsx# bàn thư pháp 3D; onClick -> mở composer; có hào quang
    Petals.tsx         # cánh hoa rơi (Points), ẩn khi mưa
    Rain.tsx           # mưa (LineSegments), hiện khi điều kiện = rain
    Dew.tsx            # giọt sương lấp lánh trôi (Points, JS)
    Critters.tsx       # bướm + chuồn chuồn (texture cánh canvas), vỗ cánh, bay vòng
    CameraRig.tsx      # orbit + pinch tự viết; tự xoay khi idle; cập nhật pointer.moved
    SceneEnv.tsx       # ánh sáng + fog theo điều kiện; "tick" gió mỗi frame
    useIsMobile.ts     # hook phát hiện mobile (SSR-safe)
  ui/
    SkyBackdrop.tsx    # div #sky gradient theo điều kiện thời tiết
    WeatherPanel.tsx   # huy hiệu Hà Nội + công tắc Nắng/Mây/Mưa/Đêm/Tự động
    WishCard.tsx       # thẻ đọc điều ước (mở khi click giấy)
    Composer.tsx       # bảng viết: chọn theme + nhập text -> POST /api/wishes
    LacBird.tsx        # <img> chim Lạc (public/chim-lac.jpg) + mix-blend-mode
    Toast.tsx, Loader.tsx
lib/
  themes.ts            # THEMES (8 chủ đề) + ThemeKey + isThemeKey
  tree.ts              # BRANCHES/TIPS (hình học cây), THEME_ZONE, PRNG tất định, anchorFor/tipFor
  weather.ts           # Condition, SKIES, WX_ICON/VI, PRESETS (đèn/fog), codeToCond, windFromSpeed, HANOI
  windMaterial.ts      # makeWindMaterial(): MeshLambertMaterial + vertex shader gió GPU (.tick)
  profanity.ts         # containsProfanity + validateWish (giữ dấu, khớp theo TỪ; ưu tiên KHÔNG chặn nhầm)
  ratelimit.ts         # rate-limit theo IP (in-memory)
  runtime.ts           # windRef {current,target} + pointer {moved,dragging} — chia sẻ KHÔNG re-render
  wishes.ts            # type Wish, SEED_WISHES, subscribeApproved() (onSnapshot, sort client)
  firebase.client.ts   # init client SDK (null nếu thiếu env -> dùng seed)
  firebase.admin.ts    # init Admin SDK (server-only)
store/
  useScene.ts          # zustand: autoCond/manual/temp, wishes, openWish, composerOpen, toast, loaded
scripts/seed.mjs       # seed vài điều ước 'approved' vào Firestore
firestore.rules        # client chỉ read 'approved'; write = false (ghi qua Admin SDK)
.github/workflows/ci.yml # CI: lint + build mỗi push/PR vào master
```

## 4. Luồng dữ liệu

### Điều ước (chính)
1. **Đọc**: `DataBridge` gọi `subscribeApproved()` (lib/wishes) → `onSnapshot` Firestore `wishes` where `status=='approved'` → `useScene.setWishes`. `WishPapers` đọc `wishes` từ store, render InstancedMesh, vị trí **tất định** theo `anchorFor(id, theme)` (lib/tree, PRNG seed theo id → không nhảy giữa các lần load). Mỗi `theme` = một "zone" (ngọn cành). Dây nối từ ngọn cành (`tipFor`) xuống tờ giấy.
2. **Ghi**: `Composer` validate client (`validateWish`) → `POST /api/wishes` → server: kiểm theme, `validateWish` (lọc từ), `rateLimit` theo IP → ghi doc `status:'pending'` bằng Admin SDK.
3. **Duyệt**: `/admin` (nhập `ADMIN_SECRET`) → `GET/PATCH /api/admin/wishes` (header `x-admin-secret`) → đặt `approved`/`rejected`. Khi `approved`, client `onSnapshot` tự thêm tờ mới → cây cập nhật realtime.

Chưa cấu hình Firebase: `getDb()` trả null → dùng `SEED_WISHES`; `/api/wishes` trả 503 gọn.

### Thời tiết
`DataBridge` `fetch('/api/weather')` (proxy Open-Meteo, cache 10') → `codeToCond` + `windFromSpeed` → `useScene.setAuto(cond,temp)` và **`windRef.target`** (lib/runtime). `WeatherPanel` cho ghi đè manual. `useCondition()` = `manual ?? autoCond`. `SkyBackdrop`/`SceneEnv` đọc điều kiện đổi nền trời, đèn, fog, bật/tắt mưa.

### Gió (mỗi frame, KHÔNG re-render)
`SceneEnv` mỗi frame ease `windRef.current → windRef.target`. Các thành phần đọc `windRef.current`:
- Cỏ/cỏ lau: **GPU** — `makeWindMaterial(...).tick(time, wind)` chỉ set 1 uniform/frame (vertex shader uốn đỉnh). Đây là lý do cỏ dày vẫn mượt mobile.
- DecorPapers/WishPapers/Blossoms/Dew/Critters: cập nhật ma trận/điểm bằng JS (số lượng nhỏ, giảm theo mobile).

## 5. Hiệu năng mobile (nguyên tắc CỐT LÕI)

- **InstancedMesh** cho cỏ, lau, hoa, giấy (1 draw call/loại).
- **Gió cỏ chạy GPU** (lib/windMaterial) thay vì JS từng instance.
- Số lượng giảm theo `useIsMobile()` (ví dụ cỏ 850→280, bướm 6→3, sương 55→22).
- `dpr` cap (mobile 1.5), `antialias` chỉ desktop, `AdaptiveDpr` (drei) tự hạ chất lượng khi tụt FPS.
- Texture (hoa, cánh bướm, chim glow) **vẽ bằng canvas, dùng chung**, không tải asset ngoài.
- Khi thêm hiệu ứng mới: ưu tiên instancing + GPU; nếu dùng JS `useFrame` thì giữ số lượng nhỏ và scale theo mobile.

## 6. Mô hình dữ liệu Firestore (`wishes`)

```ts
{ text: string(<=160), theme: ThemeKey, author?: string,
  status: 'pending'|'approved'|'rejected', createdAt: serverTimestamp }
```
Rules (`firestore.rules`): client `read` chỉ khi `status=='approved'`; `write:false` (mọi ghi qua Admin SDK). Query client **không orderBy** (tránh composite index) — sort theo `createdAt` ở client.

## 7. Biến môi trường (`.env.local`, mẫu `.env.local.example`)

- `NEXT_PUBLIC_FIREBASE_*` (6 biến) — client đọc Firestore (công khai, an toàn).
- `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` — Admin SDK (server-only). Code xử lý `\n` an toàn (`.replace(/\\n/g,'\n')`).
- `ADMIN_SECRET` — mã đăng nhập `/admin`.

Vercel: import `.env.local` khi tạo project. App **không dùng Firebase Auth** → KHÔNG cần "Authorized domains".

## 8. Gotchas (đọc trước khi sửa)

- **ESLint**: Next 16 bật rule React-Compiler (`purity`/`immutability`/`set-state-in-effect`) báo nhầm với code Three.js (Math.random trong useMemo, mutate buffer trong useFrame). Đã **tắt cho `components/three/**`** + vài file UI trong `eslint.config.mjs`. Đừng "sửa" các cảnh báo này bằng cách viết lại — chúng cố ý.
- **Canvas SSR**: phải `dynamic(..., { ssr:false })` từ client component (HomeClient). Không import trực tiếp ở server component.
- **Chim Lạc**: `public/chim-lac.jpg` là ảnh ĐEN/nền TRẮNG; nền trắng được bỏ bằng `mix-blend-mode: multiply` (xem `.composer-head .lac`, `.lac-watermark` trong globals.css). Muốn đổi màu chim cần CSS filter.
- **Click vs xoay**: `WishPapers`/`CalligraphyDesk` onClick bỏ qua nếu `pointer.moved > 7` (lib/runtime) để không mở khi đang orbit.
- **Vị trí điều ước tất định**: dựa trên `anchorFor(id, theme)` — đừng đổi seed/PRNG nếu không muốn mọi tờ đổi chỗ.
- **Lọc từ**: `lib/profanity.ts` cố ý GIỮ DẤU và khớp theo TỪ nguyên vẹn để tránh chặn nhầm ("buổi", "lớn", "ngủ"…). Hàng chờ duyệt là lớp chặn thứ hai.

## 9. Lệnh & deploy

```bash
npm run dev     # http://localhost:3000 (LAN để test mobile cùng wifi)
npm run build   # bản production (Turbopack)
npm run lint    # eslint
npm run seed    # seed điều ước mẫu vào Firestore (cần FIREBASE_* trong .env.local)
```
- Repo: github.com/dken19/wish-tree (SSH). **Push `master` → Vercel auto-deploy** (production); PR → preview.
- CI: `.github/workflows/ci.yml` chạy lint + build (không cần secret — build có fallback).
