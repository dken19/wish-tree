# Kiến trúc — Cây Ước Nguyện

Tài liệu này giúp **phiên làm việc sau (người hoặc AI)** hiểu nhanh toàn bộ dự án trước khi sửa code.

## 1. Tổng quan

Website một trang: **cây 3D treo những tờ giấy điều ước**, có gió + thời tiết Hà Nội theo thời gian thực, cảnh nền thung lũng (đồi/núi/rừng/xóm nhà), đồng cỏ + cỏ lau + hoa vàng đung đưa, bướm/chuồn chuồn, giọt sương, và một **bàn thư pháp** để viết điều ước. Hoạ tiết **chim Lạc (Đông Sơn)** ở khung viết.

Luồng người dùng: chạm tờ giấy → đọc điều ước · chạm bàn thư pháp → mở khung viết → gửi → **lọc từ tục + hàng chờ duyệt** → admin duyệt ở `/admin` → điều ước hiện **realtime** trên cây.

Có **menu dock** (góc dưới-phải, `NavDock`) để chuyển nhanh: Cây · Viết điều ước · Phòng ôn bài (đổi cảnh bằng state, CÙNG 1 Canvas) · **Kỹ năng sống** (`/ky-nang` — trang riêng dạy nấu nướng · trồng trọt · chụp ảnh · chăm sóc da, có ảnh minh hoạ + nguồn uy tín; KHÔNG dùng Canvas để đỡ pin).

Ngoài ra có **thiền viện** trên đỉnh núi xa: chạm → vào **phòng Rừng Trúc** (cảnh 3D rừng trúc) để cùng nhau ôn bài/làm việc — thấy nhau qua avatar người thiền (hiện **đồng hồ phiên** trên đầu), có **đồng hồ flip** + **hẹn giờ Pomodoro**. Realtime qua Firestore `sessions` (presence ẩn danh, không Auth).

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
  ky-nang/
    page.tsx           # server: metadata + render <SkillsView/> (route /ky-nang, KHÔNG Canvas)
    SkillsView.tsx     # client: 4 tab (Nấu/Trồng/Chụp ảnh/Chăm sóc da) + thẻ accordion có ẢNH minh hoạ + link NGUỒN (đọc lib/skills); ảnh hỏng tự ẩn (onError)
  dieu-uoc/
    page.tsx           # server: metadata + <Suspense><WishesView/></Suspense> (route /dieu-uoc, KHÔNG Canvas)
    WishesView.tsx     # client: lọc theo chủ đề + phân trang SỐ (state qua URL ?theme=&page=) -> fetch /api/wishes/list
  api/
    weather/route.ts   # GET: proxy Open-Meteo (Hà Nội), cache 10'
    wishes/route.ts    # POST: validate+lọc từ+rate-limit -> nếu có Bearer ID token hợp lệ thì approved (đăng ngay), không thì pending (Admin SDK)
    wishes/list/route.ts # GET ?page=&theme=: liệt kê approved, phân trang SERVER (count + orderBy createdAt + offset/limit); fallback SEED khi chưa cấu hình
    admin/wishes/route.ts # GET list pending / PATCH duyệt|từ chối (header x-admin-secret)
    presence/route.ts  # POST: heartbeat|leave phòng Rừng Trúc -> ghi `sessions` (Admin SDK)
components/
  HomeClient.tsx       # 'use client'; dynamic import Canvas + lớp UI overlay
  WishTreeCanvas.tsx   # <Canvas> R3F: dpr cap; GATE cảnh cây (visible) vs <FocusRoom/> theo roomOpen
  DataBridge.tsx       # render rỗng: subscribe điều ước + fetch thời tiết -> đẩy vào store
  PresenceBridge.tsx   # render rỗng: CHỈ khi roomOpen — heartbeat + subscribe sessions + leave (sendBeacon)
  AuthBridge.tsx       # render rỗng: onAuthStateChanged (Firebase Auth) -> ghi user vào store
  three/
    Tree.tsx           # thân+rễ+cành cổ thụ: ống cong bezier (a->bend->b) thuôn, gộp 1 mesh
    Ground.tsx         # nền (đỉnh núi) + gò + tảng đá (<Rock> mỗi viên 1 makeRock, lún vào đất)
    Scenery.tsx        # cảnh nền: núi đá vôi xa BO TRÒN đỉnh (makePeak dome) + RỪNG THÔNG xa (instanced, theo terrainHeight, r16-60) + xóm nhà xa
    Clouds.tsx         # biển mây quanh đỉnh núi (theme đỉnh núi) — tĩnh/nhẹ
    StonePath.tsx      # VÒNG phiến đá trắng (ÍT, tách xa, lộ cỏ) quanh gốc cây + DẢI đá LIỀN MẠCH chạy về hướng đền (peakCenter, xuống thung lũng, mờ dần); đá RoundedBox bo góc + texture canvas nứt/sứt/lốm đốm; bám groundHeight + nghiêng slopeQuaternion nhẹ, instanced
    Meadow.tsx         # cỏ dày (instanced, gió GPU) + cỏ lau viền rìa (thân+bông) + hoa vàng (points)
    Foliage.tsx        # tán sồi: card chùm lá + HỆ CÀNH khô phân nhánh (lib/branch, gộp 1 mesh) đỡ lá quanh các TIP, đung đưa theo gió
    Blossoms.tsx       # hoa trên tán = point sprite mềm (texture canvas), bob theo gió
    DecorPapers.tsx    # giấy đỏ trang trí (InstancedMesh) đung đưa — KHÔNG click
    WishPapers.tsx     # điều ước đã duyệt (InstancedMesh) — CLICK đọc; dây nối cành
    CalligraphyDesk.tsx# bàn thư pháp 3D; onClick -> mở composer; có hào quang
    Monastery.tsx      # ĐỀN 3 tầng cầu kỳ trên đỉnh núi xa (peakCenter, quay về tâm): bệ đá+bậc, cột son, mái đầu đao, cửa/đèn lồng PHÁT SÁNG + cột sáng/hào quang/hạt sáng nhấp nháy mời bấm -> setRoomOpen(true)
    FocusRoom.tsx      # PHÒNG RỪNG TRÚC: RoomCamera tự xoay + fog/đèn riêng + nền SỎI TRẮNG (texture) + sỏi 3D (đổ bóng) + TIA NẮNG xuyên ngọn (cone additive) + sương; gate active
    Bamboo.tsx         # rừng trúc: thân CÓ ĐỐT mọc theo CỤM (3–7 cây/cụm, đổ bóng) + NHÁNH LÁ rủ dọc thân (cross-plane, lá hẹp nhọn) + LÁ ĐƠN rơi (Points, JS)
    Meditators.tsx     # avatar người thiền (instanced, từ store.sessions) + nhãn tên/đồng hồ phiên (sprite canvas, 1Hz)
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
    NavDock.tsx        # MENU dock tròn góc dưới-phải: xòe 4 mục (Cây/Viết/Phòng ôn bài qua store; Kỹ năng sống -> router.push('/ky-nang')); ẩn khi roomOpen/composerOpen
    FocusHUD.tsx       # overlay phòng: đồng hồ flip + Pomodoro + số online + đổi tên + Rời phòng
    LacBird.tsx        # <img> chim Lạc (public/chim-lac.jpg) + mix-blend-mode
    Toast.tsx, Loader.tsx
lib/
  auth.ts              # client: watchAuth/signInGoogle/signInFacebook/signOutUser/getIdToken + type AuthUser (Firebase Auth)
  themes.ts            # THEMES (8 chủ đề) + ThemeKey + isThemeKey
  skills.ts            # SKILL_CATEGORIES (4 nhóm: Nấu/Trồng/Chụp ảnh/Chăm sóc da) cho /ky-nang — mỗi kỹ năng có img (Wikimedia Commons, đã verify 200) + source (Wikipedia, ad-free). Thuần dữ liệu
  peaks.ts             # RINGS/VALLEY_FLOOR + peakCenter(ri,i): vị trí đỉnh núi xa (Scenery dựng mesh, Monastery đặt thiền viện)
  presence.ts          # type Session, subscribeSessions (onSnapshot, lọc staleness), heartbeat/leave, clientId+nickname (localStorage)
  tree.ts              # BRANCHES/TIPS (hình học cây), THEME_ZONE, PRNG tất định, anchorFor/tipFor
  terrain.ts           # terrainHeight(x,z) (Ground dựng lưới) + groundHeight(x,z)=terrainHeight(x,-z) cho ĐẶT vật (z bị lật do rotateX) + rEdgeAt + VALLEY + HỆ BÁM ĐẤT: terrainNormal(x,z) + slopeQuaternion(x,z,blend) (nghiêng vật theo sườn)
  branch.ts            # makeBranch() HỆ cành khô phân nhánh cong gnarled (đệ quy, ống CatmullRom thuôn) + mergeBranches() -> 1 geometry
  rock.ts              # makeRock(seed) tảng đá LIỀN KHỐI kín (icosphere + nhiễu liên tục + kéo lệch trục -> watertight, không hở)
  textures.ts          # texture PBR sinh thủ tục (canvas): vỏ cây, chùm lá sồi, cỏ + normal map
  weather.ts           # Condition, SKIES, WX_ICON/VI, PRESETS (đèn/fog), codeToCond, windFromSpeed, HANOI
  windMaterial.ts      # makeWindMaterial(): MeshLambertMaterial + vertex shader gió GPU (.tick)
  profanity.ts         # containsProfanity + validateWish (giữ dấu, khớp theo TỪ; ưu tiên KHÔNG chặn nhầm)
  ratelimit.ts         # rate-limit theo IP (in-memory)
  runtime.ts           # windRef {current,target} + pointer {moved,dragging} — chia sẻ KHÔNG re-render
  wishes.ts            # type Wish, SEED_WISHES, subscribeApproved() (onSnapshot, sort client)
  firebase.client.ts   # init client SDK: getDb (đọc Firestore) + getAuthClient (Auth); null nếu thiếu env
  firebase.admin.ts    # init Admin SDK (server-only): getAdminDb + getAdminAuth (verifyIdToken)
store/
  useScene.ts          # zustand: autoCond/manual/temp, wishes, openWish, composerOpen, toast, loaded, roomOpen, sessions, nickname, navOpen, user
scripts/seed.mjs       # seed vài điều ước 'approved' vào Firestore
firestore.rules        # client read 'approved' (wishes) + read sessions; write = false (ghi qua Admin SDK)
firestore.indexes.json # composite index cho /api/wishes/list: (status,createdAt) + (status,theme,createdAt)
.github/workflows/ci.yml # CI: lint + build mỗi push/PR vào master
```

## 4. Luồng dữ liệu

### Điều hướng (menu dock)
`NavDock` (góc dưới-phải) là **trung tâm chuyển cảnh**: nút mở là **cuộn giấy bí kíp** (dựng thuần CSS — thân giấy + 2 trục gỗ + triện đỏ chữ thư pháp "Bí" + quầng sáng vàng, KHÔNG ảnh ngoài; KHÔNG dùng chữ Hán), bấm để mở (`navOpen`), chọn 1 trong 5 mục:
- **Cây ước nguyện** → `roomOpen=false`, đóng composer/wish (đổi state).
- **Viết điều ước** → `composerOpen=true` (giống bấm bàn thư pháp).
- **Phòng ôn bài** → `roomOpen=true` (giống bấm thiền viện); lúc này NavDock tự ẩn (FocusHUD trượt lên thay).
- **Kỹ năng sống** → `router.push('/ky-nang')` (đổi **route** thật).
- **Tất cả ước nguyện** → `router.push('/dieu-uoc')` (đổi **route** thật — trang danh sách phân trang, KHÔNG Canvas). Trang `/ky-nang` (`SkillsView`) là trang tĩnh đọc `lib/skills`, **không mount Canvas** → rời cảnh 3D khi đọc để tiết kiệm pin; bấm "← Về cây ước nguyện" để quay lại (Canvas dựng lại từ loader). 3 mục đầu vẫn giữ nguyên 1 Canvas (chỉ đổi state). **Ảnh kỹ năng** hotlink trực tiếp từ `upload.wikimedia.org` (Wikimedia Commons — ad-free, ổn định) bằng thẻ `<img>` thường (KHÔNG `next/image` → khỏi cấu hình `remotePatterns`); `onError` ẩn ảnh để không vỡ layout. Mọi URL ảnh + nguồn đã verify trả 200 trước khi đưa vào `lib/skills.ts`.

### Điều ước (chính)
1. **Đọc**: `DataBridge` gọi `subscribeApproved()` (lib/wishes) → `onSnapshot` Firestore `wishes` where `status=='approved'` → `useScene.setWishes`. `WishPapers` đọc `wishes` từ store, render InstancedMesh, vị trí **tất định** theo `anchorFor(id, theme)` (lib/tree, PRNG seed theo id → không nhảy giữa các lần load). Mỗi `theme` = một "zone" (ngọn cành). Dây nối từ ngọn cành (`tipFor`) xuống tờ giấy.
2. **Ghi**: `Composer` validate client (`validateWish`) → `POST /api/wishes` → server: kiểm theme, `validateWish` (lọc từ), `rateLimit` theo IP. Sau đó đọc header `Authorization: Bearer <ID token>`:
   - **Có token hợp lệ** (đăng nhập Google/Facebook) → `getAdminAuth().verifyIdToken` → ghi doc `status:'approved'` + `uid` + `author=tên` → **hiện ngay** trên cây, KHỎI chờ duyệt.
   - **Không/ token lỗi** (ẩn danh) → ghi `status:'pending'` như cũ.
   - Lọc từ + rate-limit GIỮ NGUYÊN cho cả hai (auto-approve chỉ bỏ qua hàng chờ tay).
3. **Duyệt** (chỉ cho ước ẩn danh): `/admin` (nhập `ADMIN_SECRET`) → `GET/PATCH /api/admin/wishes` (header `x-admin-secret`) → đặt `approved`/`rejected`. Khi `approved`, client `onSnapshot` tự thêm tờ mới → cây cập nhật realtime.
4. **Xem tất cả** (`/dieu-uoc`, `WishesView`): trang KHÔNG Canvas, gọi `GET /api/wishes/list?page=&theme=` (Admin SDK) → phân trang **ở server** (`count()` cho tổng số trang + `orderBy('createdAt','desc').offset().limit()`), lọc theo chủ đề. State đọc/ghi qua URL (`?theme=&page=`) để share link + nút back hoạt động.

**Đăng nhập (Google/Facebook):** `AuthBridge` (`onAuthStateChanged`) → `useScene.user`. `Composer` hiện nút đăng nhập/đăng xuất; khi gửi, đính `getIdToken()` vào header. Client KHÔNG bao giờ tự ghi Firestore — server `verifyIdToken` mới là nơi quyết định `approved`.

Chưa cấu hình Firebase: `getDb()`/`getAuthClient()` trả null → dùng `SEED_WISHES`, Composer ẩn nút đăng nhập; `/api/wishes` trả 503 gọn; `/api/wishes/list` phân trang SEED trong JS.

### Thời tiết
`DataBridge` `fetch('/api/weather')` (proxy Open-Meteo, cache 10') → `codeToCond` + `windFromSpeed` → `useScene.setAuto(cond,temp)` và **`windRef.target`** (lib/runtime). `WeatherPanel` cho ghi đè manual. `useCondition()` = `manual ?? autoCond`. `SkyBackdrop`/`SceneEnv` đọc điều kiện đổi nền trời, đèn, fog, bật/tắt mưa.

### Gió (mỗi frame, KHÔNG re-render)
`SceneEnv` mỗi frame ease `windRef.current → windRef.target`. Các thành phần đọc `windRef.current`:
- Cỏ/cỏ lau/trúc: **GPU** — `makeWindMaterial(...).tick(time, wind)` chỉ set 1 uniform/frame (vertex shader uốn đỉnh). Đây là lý do cỏ dày vẫn mượt mobile.
- DecorPapers/WishPapers/Blossoms/Dew/Critters: cập nhật ma trận/điểm bằng JS (số lượng nhỏ, giảm theo mobile).

### Phòng Rừng Trúc / presence (thiền viện)
Bấm **thiền viện** (`Monastery`, trên đỉnh núi xa) → `useScene.setRoomOpen(true)`. `WishTreeCanvas` ẩn cảnh cây (`<group visible={!roomOpen}>`, KHÔNG unmount) và bật `<FocusRoom active>`; `CameraRig` nhận `disabled={roomOpen}` (ngừng ghi camera) để `RoomCamera` tiếp quản. Cảnh phòng = rừng trúc + người thiền + (HUD HTML) đồng hồ flip & Pomodoro.

Presence (giống mô hình điều ước: **client đọc, server ghi**):
1. **Ghi**: `PresenceBridge` (chỉ khi `roomOpen`) gửi `heartbeat` ngay + mỗi `HEARTBEAT_MS` (18s) → `POST /api/presence` → Admin SDK `set` doc `sessions/{clientId}` với `lastSeen=serverTimestamp` (và `joinedAt` CHỈ khi doc chưa tồn tại). Đóng tab/ẩn tab → `navigator.sendBeacon('/api/presence', {action:'leave'})` (route đọc cả body `text/plain`).
2. **Đọc**: `subscribeSessions` (`lib/presence`) `onSnapshot(collection 'sessions')` **không where/orderBy** → lọc client `now - lastSeen < STALE_MS` (40s, ẩn "ma" khi đóng tab cứng) + sort theo `joinedAt` → `useScene.setSessions`. `Meditators` render avatar instanced; **đồng hồ phiên = `now - joinedAt` tính ở client mỗi giây** (0 ghi Firestore).
3. **Danh tính ẩn danh**: `clientId = crypto.randomUUID()` + `nickname` lưu `localStorage` (KHÔNG dùng Auth). Avatar của mình tô vàng (`isSelf`).

Chưa cấu hình Firebase: `getDb()` null → `subscribeSessions` trả về 1 phiên "self" cục bộ (vẫn vào phòng được); `/api/presence` trả 503 gọn.

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
  uid?: string,  // có khi gửi bởi người đăng nhập Google/Facebook (-> auto-approve)
  status: 'pending'|'approved'|'rejected', createdAt: serverTimestamp }
```
Rules (`firestore.rules`): client `read` chỉ khi `status=='approved'`; `write:false` (mọi ghi qua Admin SDK). Query realtime của cây **không orderBy** (tránh composite index) — sort theo `createdAt` ở client. **Ngoại lệ:** trang `/dieu-uoc` phân trang ở server (`/api/wishes/list`) DÙNG `orderBy('createdAt')` + `where` → cần composite index, khai báo ở `firestore.indexes.json` (xem Gotchas).

### Firestore `sessions` (presence phòng Rừng Trúc)

```ts
// doc id = clientId
{ clientId: string, name: string(<=24),
  joinedAt: serverTimestamp,  // đặt 1 lần -> đếm giờ phiên ở client
  lastSeen: serverTimestamp,  // cập nhật mỗi heartbeat -> lọc staleness 40s
  pomo?: { phase: 'focus'|'break'|'idle', endsAt: number } }  // (tuỳ chọn, chưa broadcast)
```
Rules: `read: if true` (không chứa PII), `write: false` (ghi qua `/api/presence`). Đọc **không where/orderBy** → lọc staleness + sort ở client. Lượng ghi ≈ N người × 1 ghi/18s; đồng hồ giây = client tính từ `joinedAt` → 0 ghi. (Tuỳ chọn dọn ghost: Firestore TTL trên `lastSeen`.)

## 7. Biến môi trường (`.env.local`, mẫu `.env.local.example`)

- `NEXT_PUBLIC_FIREBASE_*` (6 biến) — client đọc Firestore (công khai, an toàn).
- `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` — Admin SDK (server-only). Code xử lý `\n` an toàn (`.replace(/\\n/g,'\n')`).
- `ADMIN_SECRET` — mã đăng nhập `/admin`.

**Đăng nhập Google/Facebook KHÔNG cần biến env mới** — dùng lại `NEXT_PUBLIC_FIREBASE_*` (client) + creds Admin (`verifyIdToken`). Nhưng **CẦN cấu hình Firebase Console**: bật provider Google & Facebook (Facebook cần tạo Facebook Developer App, dán App ID/secret + OAuth redirect), và thêm **Authorized domains** (localhost + domain Vercel). Presence phòng Rừng Trúc vẫn ẩn danh, không liên quan Auth này.

Vercel: import `.env.local` khi tạo project.

## 8. Gotchas (đọc trước khi sửa)

- **ESLint**: Next 16 bật rule React-Compiler (`purity`/`immutability`/`set-state-in-effect`) báo nhầm với code Three.js (Math.random trong useMemo, mutate buffer trong useFrame). Đã **tắt cho `components/three/**`** + vài file UI trong `eslint.config.mjs`. Đừng "sửa" các cảnh báo này bằng cách viết lại — chúng cố ý.
- **Canvas SSR**: phải `dynamic(..., { ssr:false })` từ client component (HomeClient). Không import trực tiếp ở server component.
- **Chim Lạc**: `public/chim-lac.jpg` là ảnh ĐEN/nền TRẮNG; nền trắng được bỏ bằng `mix-blend-mode: multiply` (xem `.composer-head .lac`, `.lac-watermark` trong globals.css). Muốn đổi màu chim cần CSS filter.
- **Click vs xoay**: `WishPapers`/`CalligraphyDesk` onClick bỏ qua nếu `pointer.moved > 7` (lib/runtime) để không mở khi đang orbit.
- **Vị trí điều ước tất định**: dựa trên `anchorFor(id, theme)` — đừng đổi seed/PRNG nếu không muốn mọi tờ đổi chỗ.
- **Lọc từ**: `lib/profanity.ts` cố ý GIỮ DẤU và khớp theo TỪ nguyên vẹn để tránh chặn nhầm ("buổi", "lớn", "ngủ"…). Hàng chờ duyệt là lớp chặn thứ hai.
- **Đặt vật thể ngoài đỉnh phẳng** (thông, nhà, đá): PHẢI lấy y từ `terrainHeight(x,z)` (`lib/terrain`) nếu không sẽ lơ lửng/chìm vào sườn dốc. Đỉnh phẳng có bán kính `rEdgeAt(ang)` (~6.7–11.3); để vùng cây/cỏ/bàn gọn trong rìa, vật nền (rừng/xóm) đặt từ r≈16 trở ra.
- **HỆ BÁM ĐẤT ("trọng lực" nhẹ)**: MỌI vật đặt trên đất phải lấy Y từ `groundHeight(x,z)` (KHÔNG hardcode `y=0`). Vật rải trên sườn nên nghiêng theo `slopeQuaternion(x,z,blend)` (quay +Y về pháp tuyến `terrainNormal`, `blend` 0.5–0.6 để nghiêng vừa) cho cảm giác trọng lực tự nhiên. **Tính 1 LẦN lúc dựng cảnh** (bake vào ma trận instance trong `useLayoutEffect`/`useMemo`), KHÔNG gọi mỗi frame → 0 chi phí runtime, an toàn mobile. KHÔNG dùng engine vật lí thật (rapier/cannon) — thừa cho cảnh tĩnh + vi phạm nguyên tắc no-lag.
- **Cảnh tĩnh phải TẤT ĐỊNH (không đổi giữa các lần load)**: cỏ/cỏ lau/hoa (Meadow), rừng thông (Scenery), tán lá + cành (Foliage), tảng đá (Ground) đều rải bằng `mulberry32(seed)` với **seed cố định**, KHÔNG dùng `Math.random` trực tiếp. `makeRock(seed)` và `makeBranch({rng})` nhận nguồn ngẫu nhiên qua tham số. Đừng thay lại bằng `Math.random` (sẽ làm cảnh nhảy mỗi lần tải).
- **Đổi cảnh dùng 1 Canvas**: phòng Rừng Trúc KHÔNG mở Canvas thứ hai (tránh 2 WebGL context gây stall mobile). Cảnh cây bị `visible={false}` (KHÔNG unmount → vào lại tức thì) nhưng `useFrame` vẫn chạy; chỉ MỘT camera rig ghi `camera.position` (gate qua `roomOpen`/`disabled`). `Monastery` import `peakCenter` từ `lib/peaks` (KHÔNG từ `Scenery`) để tránh import vòng.
- **Thiền viện ở xa (~r80)**: glow sprite dùng `sizeAttenuation:false` để giữ kích thước/vùng-chạm ổn định trên màn dù xa; click bỏ qua nếu `pointer.moved > 7` như các onClick khác.
- **Presence ghi/ma**: heartbeat 18s, ẩn phiên nếu `now-lastSeen ≥ 40s` (lọc ở client). Đóng tab cứng không kịp `leave` → biến mất sau ≤40s. `sendBeacon` gửi `text/plain` nên route `/api/presence` đọc `req.text()` rồi `JSON.parse`. Rate-limit presence nới rộng (`30/phút`, key theo `clientId:ip`) — mặc định 5/10ph sẽ chặn nhầm heartbeat.
- **Nhãn avatar = sprite canvas, KHÔNG drei `<Html>`**: mỗi avatar 1 `CanvasTexture` vẽ lại **1 lần/giây** (throttle trong `useFrame`) → không tạo DOM/giây/avatar gây jank mobile. Số avatar cap `CAP=24` (dư ẩn).
- **ESLint**: thêm `components/PresenceBridge.tsx` + `components/ui/FocusHUD.tsx` vào danh sách tắt `set-state-in-effect` (đồng bộ localStorage/timer). Ghi ref trong render bị `react-hooks/refs` chặn → cập nhật ref trong `useEffect`.
- **Auto-approve do SERVER quyết định, KHÔNG tin client**: client chỉ đính `Authorization: Bearer <ID token>`; `/api/wishes` `verifyIdToken` rồi mới đặt `status:'approved'`. Token sai/hết hạn → tự rớt về `pending`. Đừng để client gửi thẳng `status` (sẽ bị giả mạo). Client vẫn KHÔNG bao giờ ghi Firestore trực tiếp (`firestore.rules` `write:false`).
- **`/dieu-uoc` cần composite index (ngoại lệ có chủ đích)**: cây dùng query không-orderBy để né index, nhưng phân trang số ở server BẮT BUỘC `orderBy('createdAt')` + `where('status')` [+ `where('theme')`] → 2 composite index trong `firestore.indexes.json`. Tạo bằng `firebase deploy --only firestore:indexes` HOẶC bấm link Console mà Firestore tự gợi ý ở lần query đầu (báo lỗi `FAILED_PRECONDITION`). Thiếu index → `/api/wishes/list` lỗi.
- **`offset()` của Firestore tính phí cả doc bị skip**: phân trang `/api/wishes/list` dùng `offset((page-1)*PAGE_SIZE)`; trang càng sâu càng tốn đọc. Chấp nhận ở quy mô này; nếu dữ liệu lớn hẳn, đổi sang cursor `startAfter`.
- **`/dieu-uoc` dùng `useSearchParams` → phải bọc `<Suspense>`** (Next App Router yêu cầu) — đã bọc trong `app/dieu-uoc/page.tsx`. Trang này KHÔNG mount Canvas (giống `/ky-nang`) để nhẹ pin. `WishesView.tsx` được thêm vào danh sách tắt `set-state-in-effect` trong `eslint.config.mjs` (đặt `loading` đồng bộ khi đổi `page`/`theme` — pattern fetch giống `app/admin/page.tsx`).
- **App GIỜ CÓ dùng Firebase Auth**: phải thêm Authorized domains trong Firebase Console (localhost + domain Vercel) nếu không `signInWithPopup` báo `auth/unauthorized-domain`. (Ghi chú cũ "không dùng Auth" đã hết hiệu lực.)

## 8b. Nhật ký lỗi đã sửa (ghi NGAY sau mỗi lần sửa)

Quy ước: mỗi khi sửa xong một lỗi cảnh/đồ hoạ, ghi 1 dòng vào đây để phiên sau không lặp lại.

- **Đá rơi vào đỉnh cạnh gốc cây** ("đá nằm trên cây"): trước đặt đá từ `r=11`, nhưng rìa đỉnh phẳng `rEdgeAt` tới ~11.3 → đá lọt vào mặt phẳng cạnh cây. Sửa: đá đặt từ **r≥16** (ngoài hẳn rìa, trên sườn). → `Ground.tsx` rocks.
- **Cành như "que đũa", thẳng & nhọn ở ngọn**: ban đầu twig là trụ thẳng, rồi ống cong 1 nhánh vẫn thẳng/nhọn. Sửa: `lib/branch.ts` đổi sang **hệ cành khô PHÂN NHÁNH đệ quy, uốn gnarled** (CatmullRom), Foliage dùng 3 hệ/TIP. → `lib/branch.ts`, `Foliage.tsx`.
- **Tảng đá hình quá đơn giản / bị hở lỗ**: bản gộp 3 cục icosahedron để hở khe. Sửa: `makeRock` = **1 icosphere kín + nhiễu liên tục nhiều tần + kéo lệch trục** (watertight, không hở), nâng `detail=2`. → `lib/rock.ts`.
- **Cảnh nhảy mỗi lần load**: scatter dùng `Math.random` → đổi sang `mulberry32(seed)` cố định cho toàn bộ cảnh tĩnh. → Meadow/Scenery/Foliage/Ground + `makeRock(seed)`/`makeBranch({rng})`.
- **Thông/đá lơ lửng trên không**: đặt vật bằng `terrainHeight(x,z)` trong khi lưới Ground bị `rotateX(-π/2)` làm **lật trục z** → cao độ thực là `terrainHeight(x,-z)`. Đỉnh phẳng (h≈0) không lộ, ra sườn dốc thì lệch nhiều. Sửa: thêm **`groundHeight(x,z)=terrainHeight(x,-z)`**, mọi chỗ đặt thông/đá/nhà đổi sang dùng nó. → `lib/terrain.ts`, `Scenery.tsx`, `Ground.tsx`.
- **Cành trên cao biến mất sạch**: `makeBranch` dùng `computeFrenetFrames` → **NaN** ở khúc cong → bounding sphere NaN → cả mesh cành bị frustum-cull. Sửa: thay bằng khung **parallel-transport** (không NaN) + chặn pháp tuyến 0 khi merge + `computeBoundingSphere()`. → `lib/branch.ts`.
- **Cỏ/lau/hoa lơ lửng trên sườn**: Meadow rải cỏ `r≤8`, lau `r≤8`, hoa `r≤7.8` ở `y=0` cố định; bán kính vượt rìa đỉnh phẳng (`rEdge` ~6.7) nên ở góc rìa hẹp cỏ treo lơ lửng trên không phía trên sườn dốc. Sửa: thêm **hệ bám đất** `terrainNormal`/`slopeQuaternion` vào `lib/terrain.ts`; Meadow bake `groundHeight(x,z)` vào Y + nghiêng `slopeQuaternion` (blend 0.5–0.6) trong `useLayoutEffect`; hoa vàng (Points) bake Y. Gò đất (Ground) + bàn thư pháp (CalligraphyDesk) cũng đổi sang `groundHeight` cho thống nhất. → `lib/terrain.ts`, `Meadow.tsx`, `Ground.tsx`, `CalligraphyDesk.tsx`.
- **Một số cây VẪN lơ lửng (sau khi đã groundHeight=terrainHeight(x,-z))**: lưới Ground chỉ lấy mẫu `terrainHeight` tại đỉnh lưới (cách ~3.23) rồi **nội suy TAM GIÁC**, còn sống núi `sin(ang*17)` dao động nhanh hơn 1 ô → `terrainHeight` chính xác KHÁC mặt lưới (lệch tới ~2.1). Sửa: `groundHeight` đổi sang **nội suy đúng kiểu chia tam giác của PlaneGeometry** (đường chéo fx=fy, sample 4 đỉnh ô) → khớp mặt lưới **lệch 0.0000** (verify bằng raycast trên lưới thật). Hằng số `GROUND_SIZE/GROUND_SEG` chia sẻ `terrain.ts`↔`Ground.tsx`. → `lib/terrain.ts`, `Ground.tsx`.

## 9. Lệnh & deploy

```bash
npm run dev     # http://localhost:3000 (LAN để test mobile cùng wifi)
npm run build   # bản production (Turbopack)
npm run lint    # eslint
npm run seed    # seed điều ước mẫu vào Firestore (cần FIREBASE_* trong .env.local)
```
- Repo: github.com/dken19/wish-tree (SSH). **Push `master` → Vercel auto-deploy** (production); PR → preview.
- CI: `.github/workflows/ci.yml` chạy lint + build (không cần secret — build có fallback).
