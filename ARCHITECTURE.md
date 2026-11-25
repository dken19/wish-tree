# Kiến trúc — Cây Ước Nguyện

Tài liệu này giúp **phiên làm việc sau (người hoặc AI)** hiểu nhanh toàn bộ dự án trước khi sửa code.

## 1. Tổng quan

Website một trang: **cây 3D treo những tờ giấy điều ước**, có gió + thời tiết Hà Nội theo thời gian thực, cảnh nền thung lũng (đồi/núi/rừng/xóm nhà), đồng cỏ + cỏ lau + hoa vàng đung đưa, bướm/chuồn chuồn, giọt sương, và một **bàn thư pháp** để viết điều ước. Hoạ tiết **chim Lạc (Đông Sơn)** ở khung viết.

Luồng người dùng: chạm tờ giấy → đọc điều ước · chạm bàn thư pháp → mở khung viết → gửi → **lọc từ tục + hàng chờ duyệt** → admin duyệt ở `/admin` → điều ước hiện **realtime** trên cây.

Có **menu dock** (góc dưới-phải, `NavDock`) để chuyển nhanh: Cây · Viết điều ước · Phòng ôn bài (đổi cảnh bằng state, CÙNG 1 Canvas) · **Kỹ năng sống** (`/ky-nang` — trang riêng dạy nấu nướng · trồng trọt · chụp ảnh · chăm sóc da, có ảnh minh hoạ + nguồn uy tín; KHÔNG dùng Canvas để đỡ pin).

Ngoài ra có **thiền viện** trên đỉnh núi xa: chạm → vào **phòng Rừng Trúc** (cảnh 3D rừng trúc) để cùng nhau ôn bài/làm việc — thấy nhau qua avatar người thiền (hiện **đồng hồ phiên** trên đầu), có **đồng hồ flip** + **hẹn giờ Pomodoro**. Realtime qua Firestore `sessions` (presence ẩn danh, không Auth).

## 2. Stack & phiên bản (KHÁC training data — đọc kỹ)

- **Node.js 24 LTS** — khai báo `"engines": { "node": "24.x" }` (Vercel đọc field này, ghi đè cài đặt Node trong dashboard) + `.nvmrc` (local `nvm use`) + CI. Node 20 đã bị Vercel ngừng (10/2026); nâng tiếp lên 26 thì sửa cả 3 chỗ.
- **Next.js 16.4.6** (ghim chính xác; 16.2.x có lỗ hổng critical) (App Router, **Turbopack**), **React 19**, TypeScript
- **@react-three/fiber v9** + **@react-three/drei v10** + **three 0.184**
  - three 0.184: dùng `THREE.SRGBColorSpace` (KHÔNG phải `sRGBEncoding`), `gl.outputColorSpace`.
- **zustand v5** — state UI/scene
- **firebase v12** (client SDK đọc) + **firebase-admin v13** (server ghi/duyệt)
- **next/font** (Be Vietnam Pro = body, Playfair = phụ, **Dancing Script** = thư pháp tiêu đề/điều ước)

> Cây Canvas được nạp bằng `dynamic(() => import('./WishTreeCanvas'), { ssr: false })` trong **HomeClient.tsx** (client component) vì Three.js cần `window`.

## 3. Cây thư mục

```
app/
  layout.tsx           # fonts (next/font), metadata SEO đầy đủ (metadataBase, keywords Việt, OG/twitter title+desc, robots, canonical), JSON-LD WebSite (cho Google + AI), viewport; class font lên <html>
  opengraph-image.tsx  # sinh ẢNH OG 1200×630 bằng next/og (ImageResponse): trời Hà Nội + cây treo giấy ước đỏ + chim Lạc + đồng cỏ + logo nhỏ (public/logo.png) cạnh tên miền; nhúng font app/_fonts (đủ dấu Việt)
  twitter-image.tsx    # re-export opengraph-image cho Twitter/X
  icon.png             # favicon 256×256 — logo (cây + thẻ ước đỏ + mặt trời vàng, vẽ bằng Codex) — thay favicon.ico mặc định của Vercel (đã xoá)
  apple-icon.png       # apple-touch-icon 180×180 cho màn hình chính iOS (cùng logo)
  _fonts/              # TTF Be Vietnam Pro (Regular/SemiBold) — font cho next/og, KHÔNG phải route (thư mục _ là private)
  robots.ts            # sinh /robots.txt (allow /, chặn /admin + /api/, trỏ sitemap)
  sitemap.ts           # sinh /sitemap.xml (/, /dieu-uoc, /ky-nang)
  # (public/llms.txt: mô tả site cho LLM/AI crawlers — ChatGPT/Claude/Perplexity)
  page.tsx             # server: chỉ render <HomeClient/>
  globals.css          # CSS trang chủ (overlay trên Canvas: brand, huy hiệu, Composer, WishCard, NavDock, FocusHUD, chim Lạc)
  pages.css            # CSS các trang nội dung KHÔNG Canvas (PageShell): trời 4 mốc + đèn trời, biến --pg-* (đêm tối), VÉ cuống|thân (.tk), nút/chip/tìm (.pg-*), bình luận (.wt-*, dùng chung WishCard), kỹ năng (.sk-*), văn bản (.pg-prose), admin (.adm-*)
  admin/page.tsx       # client: quản trị trong PageShell — đăng nhập Google (email admin), chip Chờ/Đã duyệt/Đã bỏ/Tất cả + Bị báo cáo, mỗi điều ước là 1 VÉ (#số, giờ, dấu mộc trạng thái) có nút Duyệt/Bỏ/Đưa về chờ ngay trên vé, phân trang
  admin/ReportsPanel.tsx # tab "Bị báo cáo": gộp báo cáo theo nội dung -> Gỡ/Ẩn hoặc Bỏ qua (hiện lại)
  ky-nang/
    page.tsx           # server: metadata + render <SkillsView/> (route /ky-nang, KHÔNG Canvas)
    SkillsView.tsx     # client (PageShell): chip 4 nhóm + mỗi kỹ năng là 1 VÉ <details> (cuống = thời gian + độ khó, thân = tên + mô tả) mở ra ẢNH + các bước + NGUỒN (lib/skills); ảnh hỏng tự ẩn
  gioi-thieu/page.tsx  # Giới thiệu (PageShell plainTitle — tiêu đề font thường cho người duyệt OAuth; tĩnh, không Canvas, không cần login) — là "Application home page" trên Google OAuth consent screen (Google bắt home page nêu tên app + mục đích + link privacy)
  chinh-sach-bao-mat/page.tsx # Chính sách bảo mật (tĩnh) — link Privacy policy của Google OAuth consent screen
  dieu-khoan/page.tsx  # Điều khoản sử dụng (tĩnh) — link Terms of service của consent screen
  tai-khoan/
    page.tsx, AccountView.tsx # "Điều ước của tôi" (PageShell, noindex): watchAuth -> chưa đăng nhập = nút Google; đã đăng nhập = số đã viết/đang cố gắng/đã đạt + chip lọc + VÉ mỗi điều ước (trạng thái duyệt + nút 2 nấc Đang cố gắng/Đã đạt được, đổi lạc quan) -> /api/me/wishes. Dev chưa có Firebase: dữ liệu mẫu (DEMO, mốc giờ cố định cho khớp hydrate)
  dieu-uoc/
    page.tsx           # server: metadata + <Suspense><WishesView/></Suspense> (route /dieu-uoc, KHÔNG Canvas)
    WishesView.tsx     # client (PageShell): số đang treo + chờ duyệt (/api/wishes/stats) ở đầu trang; mỗi điều ước là 1 VÉ (cuống #số bấm để lọc + giờ gửi + dấu "Hôm nay", thân lời ước); ô tìm (#số hoặc từ khoá) + ngày gửi + sắp xếp mới/cũ + chủ đề + phân trang SỐ (state qua URL ?q=&date=&sort=&theme=&page=) -> /api/wishes/list; thẻ có #số + giờ gửi + 💬 bình luận (WishThread) + ⚑ báo cáo; mount AuthBridge
  xam-xi/
    page.tsx, FunnyView.tsx # "Góc xàm xí": tab Từng tờ (status 'funny' + lời phê, ?page=) / Bộ sưu tập (?view=bo); KHÔNG hiện tên người viết
  api/
    wishes/route.ts    # POST: validate+lọc từ+rate-limit -> nếu có Bearer ID token hợp lệ thì approved (đăng ngay), không thì pending; cấp số #N (transaction meta/counters) + keywords; trả {id,no,status}
    wishes/[id]/comments/route.ts # GET bình luận (ai cũng đọc, lọc hidden, `mine` nếu kèm token) / POST bình luận — CHỈ người đăng nhập (verifyIdToken), validateComment + rate-limit theo uid, tăng commentCount (transaction)
    reports/route.ts   # POST báo cáo điều ước/bình luận — CHỈ người đăng nhập, 1 lần/tài khoản/nội dung, đủ AUTO_HIDE_REPORTS (3) -> tự ẩn
    admin/reports/route.ts # GET báo cáo chưa xử lý (gộp theo nội dung) / PATCH hide|dismiss — checkAdmin
    me/wishes/route.ts # GET: điều ước CỦA CHÍNH người đăng nhập (where uid==, đơn trường, sort bộ nhớ, ≤500, mọi trạng thái) / PATCH {id, progress} — chỉ chủ (uid khớp, không thì 404), ghi progress + achievedAt, rate-limit theo uid
    wishes/stats/route.ts # GET: {approved, pending} bằng count() (Admin SDK) — cache CDN 30s + memo instance 30s; fallback SEED
    wishes/list/route.ts # GET ?page=&theme=&q=&date=&sort=: approved; q="#888" -> where no==; q chữ -> keywords array-contains + lọc bộ nhớ; còn lại count + orderBy createdAt + offset/limit (sort cũ = lấy đoạn từ cuối rồi đảo, KHỎI index ASC); fallback SEED
    wishes/funny/collections/route.ts # GET: các "bộ xàm xí" (lib/funnyCollections, ẩn bộ rỗng), cache CDN 60s
    admin/funny-collections/route.ts # GET / POST {title, note = LÍ DO CHUNG bắt buộc, wishIds 2–6 tờ ở MỌI trạng thái -> batch: tạo bộ + tờ thành 'funny' + funnyGroup} / DELETE {id} (tờ không có lí do riêng nhận lí do chung làm funnyNote rồi rời bộ) — checkAdmin
    wishes/funny/route.ts # GET ?page=: tab Từng tờ = status=='funny' KHÔNG có funnyGroup (tờ trong bộ chỉ hiện ở Bộ sưu tập); đọc tối đa 1000 rồi lọc + phân trang trong bộ nhớ (Firestore không query "thiếu trường") -> {no,text,theme,note,createdAt}, KHÔNG author; cache CDN 60s
    (app/admin/FunnyCollectionsPanel.tsx: tab Xàm xí — gộp các tờ đã tích "Chọn vào bộ" thành bộ + danh sách bộ)
    admin/wishes/route.ts # GET ?status=&page= (list + counts, có tab funny) / PATCH approve|reject|pending|funny (funny bắt buộc `note` ≤300 ký tự -> funnyNote; đổi sang trạng thái khác thì xoá funnyNote) — quyền qua lib/adminAuth
    presence/route.ts  # POST: heartbeat|leave phòng Rừng Trúc -> ghi `sessions` (Admin SDK)
components/
  HomeClient.tsx       # 'use client'; dynamic import Canvas + lớp UI overlay
  WishTreeCanvas.tsx   # <Canvas> R3F: dpr cap; GATE cảnh cây (visible) vs <FocusRoom/> theo roomOpen
  DataBridge.tsx       # render rỗng: subscribe điều ước + poll số điều ước + đặt thời tiết (đêm theo giờ VN, ngày random) -> store
  PresenceBridge.tsx   # render rỗng: CHỈ khi roomOpen — heartbeat + subscribe sessions + leave (sendBeacon)
  FakePresence.tsx     # render rỗng: CHỈ khi roomOpen — "bạn học ảo" TẤT ĐỊNH theo Date.now (đồng bộ mọi thiết bị, KHÔNG ghi Firestore) -> store.bots; toast vào/rời
  AuthBridge.tsx       # render rỗng: onAuthStateChanged (Firebase Auth) -> ghi user vào store
  three/
    Tree.tsx           # thân+rễ+cành cổ thụ: ống cong bezier (a->bend->b) thuôn, gộp 1 mesh; vỏ thật qua BarkTexture (fallback vỏ canvas)
    Ground.tsx         # nền (đỉnh núi, texture đất Poly Haven qua GroundTexture; fallback cỏ canvas) + gò + đá SCAN (tảng lớn sườn xa + viên nhỏ rìa đồng cỏ né lối về đền; fallback makeRock)
    SceneWarmup.tsx    # báo store.sceneReady (cho màn chờ mực loang mở) CHỈ khi: mọi ảnh/model cảnh cây đã tải (suspend, cùng cache) + gl.compileAsync xong + đã vẽ 2 khung; trong <Suspense fallback={null}>
    SceneAssets.tsx    # asset Poly Haven CC0 trong public/scene/ (nạp NỀN, Suspense): GroundTexture (leafy_grass, trộn 2 tỉ lệ trong shader chống lộ ô lặp), BarkTexture (bark_brown_02 cho Tree), ScannedRocks (rock_07/rock_09 instanced, chuẩn hoá cỡ 1 m đáy y=0) — dùng cả ở phòng Rừng Trúc
    Scenery.tsx        # cảnh nền: núi đá vôi xa BO TRÒN đỉnh (makePeak dome) + RỪNG THÔNG xa (5 tầng mép lởm chởm, mỗi cây 1 sắc xanh instanceColor, 1 draw call, theo terrainHeight, r16-60) + xóm nhà xa
    Clouds.tsx         # biển mây quanh đỉnh núi (theme đỉnh núi) — tĩnh/nhẹ
    StonePath.tsx      # VÒNG phiến đá trắng (ÍT, tách xa, lộ cỏ) quanh gốc cây + DẢI đá LIỀN MẠCH chạy về hướng đền (peakCenter, xuống thung lũng, mờ dần); đá RoundedBox bo góc + texture canvas nứt/sứt/lốm đốm; bám groundHeight + nghiêng slopeQuaternion nhẹ, instanced
    Meadow.tsx         # cỏ PHỦ KÍN ĐỒI 2 lớp: gần (đỉnh phẳng, khóm 4 lá, 9000/mobile 3200) + xa (sườn trên tới rEdge+17, khóm 3 lá to, 5200/1800); né gốc/vòng đá/dải đá về đền/bàn thư pháp. Khóm = lá thon cong (makeTuft, gốc tối->ngọn sáng vertex color, pháp tuyến hướng lên) instanced, gió GPU + cỏ lau viền rìa (thân+bông) + hoa vàng (points)
    Foliage.tsx        # tán lá: card "cành lá" (ảnh lá thật Poly Haven island_tree_02 ghép thành chùm trên cành, atlas 2 biến thể public/scene/leaves.webp, chọn qua attribute aVar; fallback card canvas) MỌC TỎA từ đầu cành (gốc card ở trong), PHÁP TUYẾN HÌNH CẦU từ tâm tán (không lật mặt sau) -> tán sáng mềm như một khối; + HỆ CÀNH khô phân nhánh (lib/branch, gộp 1 mesh); 70 card/đầu cành (mobile 40), đung đưa theo gió
    Blossoms.tsx       # hoa trên tán = point sprite mềm (texture canvas), bob theo gió
    DecorPapers.tsx    # giấy đỏ trang trí (InstancedMesh) đung đưa — KHÔNG click
    WishPapers.tsx     # điều ước đã duyệt (InstancedMesh) — CLICK đọc; dây nối cành
    CalligraphyDesk.tsx# bàn thư pháp 3D; onClick -> mở composer; có hào quang
    TreeLantern.tsx    # ĐÈN ĐÁ đứng kiểu sân chùa (bệ, trụ, hộp đèn giấy dó, mái cong; ~1,6m) cạnh gốc cây = nguồn sáng THỨ 2 (pointLight ấm, KHÔNG đổ bóng, distance 10): mạnh về đêm (9), mưa/mây vừa, nắng chỉ hắt nhẹ; lập loè nhẹ
    Monastery.tsx      # ĐỀN 3 tầng cầu kỳ trên đỉnh núi xa (peakCenter, quay về tâm): bệ đá+bậc, cột son, mái đầu đao, cửa/đèn lồng PHÁT SÁNG + cột sáng/hào quang/hạt sáng nhấp nháy mời bấm -> setRoomOpen(true)
    FocusRoom.tsx      # PHÒNG RỪNG TRÚC: RoomCamera NGƯỜI DÙNG tự xoay/zoom (orbit thủ công, KHÔNG auto, mobile nới FOV) + fog/đèn riêng + ghìm exposure≤0.9 (đỡ loá) + nền (RoomFloor, fallback sỏi canvas) + sỏi 3D (đổ bóng) + TIA NẮNG xuyên ngọn (cone additive, dịu) + sương + Backdrop (cylinder phông NÚI ĐỒI nhiều lớp, MeshBasic fog/tonemap=off — thay nền trắng); gate active
    Player.tsx         # PlayerController: nhân vật của mình ĐI LẠI (WASD/mũi tên theo hướng camera, hoặc CHẠM ĐẤT -> walkTo), va chạm tròn + lách vật cản (lib/roomMap), đứng yên tại ghế -> ngồi thiền; tới bàn thờ -> setShrineOpen; cập nhật store.nearShrine. Trạng thái ở `player` (lib/runtime, KHÔNG re-render). RoomCamera bám theo nhân vật, tap ngắn (<350ms, <8px) = đi tới + vòng sáng TapMarker
    Shrine.tsx         # BÀN THỜ đá (tượng ngồi trên toà sen, hào quang, bàn hương + 3 nén nhang, 2 đèn đá) ở SHRINE_POS; khói nhang phụt theo bowNonce, chùm hạt vàng khi được chúc phúc; bấm tượng -> walkTo('shrine')
    Pond.tsx           # AO SEN (mặt nước, bờ đá, lá + hoa sen) ở POND
    RoomAssets.tsx     # asset Poly Haven (CC0) trong public/room/: RoomFloor (texture sỏi + normal, nền đá lát quanh bàn thờ + lối đi) + RoomPlants (shrub_03/04 + fern_02 INSTANCED, nửa số trên mobile, né bàn thờ/ao) — bọc <Suspense>
    Bamboo.tsx         # rừng trúc: thân geometry TUỲ BIẾN (makeCulmGeometry: thuôn dần + NGỌN CONG + GỜ NỔI/rãnh tối ở mấu + SỌC DỌC xanh, đốt ngắn, bóng/sọc = vertex color) theo CỤM (4–8 cây) tại BAMBOO_CLUSTERS TẤT ĐỊNH (lib/roomMap, khớp va chạm; seed cố định, scale ĐỀU, đổ bóng, gió GPU) + CÀNH cong ARCH (lên rồi cong xuống, TubeGeometry) ở nửa trên thân -> TÁN LÁ xòe LÊN đón ngọn (cross-plane, fanTexture) + LÁ ĐƠN rơi (Points, JS)
    Meditators.tsx     # NGƯỜI CHIBI ngồi thiền trên bồ đoàn (đầu to, tóc 4 kiểu, má hồng, miệng cười, mắt CHỚP, thở nhẹ, quay mặt về camera) từ store.sessions + store.bots; màu da/tóc/áo/quần/bồ đoàn chọn TẤT ĐỊNH theo hash clientId (murmur mix), mình = áo vàng; mỗi người 1 geometry GỘP vertex-color + 1 mesh mắt = 2 draw call. Nhãn tên/đồng hồ phiên (sprite canvas, 1Hz, bóng chữ; THU NHỎ khi gần camera <6 đơn vị). Avatar CỦA MÌNH = PlayerAvatar: dáng ngồi (bồ đoàn ở ghế) ↔ dáng ĐỨNG (thân+đầu gộp, chân/tay riêng đánh nhịp khi đi, thân trên gập ở hông khi vái theo bowNonce) + Aura hạt vàng khi blessedUntil > now
    Petals.tsx         # cánh hoa rơi (Points), ẩn khi mưa
    Rain.tsx           # mưa (LineSegments), hiện khi điều kiện = rain
    Dew.tsx            # giọt sương lấp lánh trôi (Points, JS)
    Critters.tsx       # bướm + chuồn chuồn (texture cánh canvas), vỗ cánh, bay vòng
    CameraRig.tsx      # orbit + pinch tự viết; tự xoay khi idle; cập nhật pointer.moved
    SceneEnv.tsx       # ánh sáng + fog theo điều kiện; "tick" gió mỗi frame
    useIsMobile.ts     # hook phát hiện mobile (SSR-safe)
  ui/
    SkyBackdrop.tsx    # div #sky gradient theo điều kiện thời tiết
    AccountButton.tsx  # nút HÌNH NGƯỜI cạnh huy hiệu giờ (trong WeatherPanel): menu nhỏ — chưa đăng nhập: Tiếp tục với Google + Điều ước của tôi; đã đăng nhập: ảnh/tên + Điều ước của tôi (/tai-khoan) + Đăng xuất; user từ store (AuthBridge)
    WeatherPanel.tsx   # huy hiệu góc trên-phải (+ AccountButton): icon thời tiết + GIỜ VIỆT NAM (ghi qua ref) — KHÔNG còn nút chuyển; mobile chỉ icon + giờ
    WishCard.tsx       # thẻ đọc điều ước (mở khi click giấy): #số + giờ gửi, dấu "Đã đạt được" nếu achieved, nút Bình luận mở WishThread (thẻ cuộn được), Báo cáo; `verified` -> lấp lánh + tên người gửi viết thư pháp
    Sparkles.tsx       # làm thẻ/vé ước của người đăng nhập NỔI BẬT: viền vàng conic xoay (mask chừa mép 2px), hào quang thở (prop `glow`, tắt cho vé vì mask cắt mép), sao 4 cánh nhấp nháy, vệt sáng quét; nền giấy ánh kim + dấu "Ước" mạ vàng ở globals.css. Chỉ animate transform/opacity, tắt khi reduced-motion; tên người gửi `.spk-name` viết thư pháp, KHÔNG kèm ảnh
    WishThread.tsx     # bình luận 1 điều ước (đọc: ai cũng được; viết: đăng nhập Google) + export ReportButton (chọn lý do -> /api/reports)
    LegalPage.tsx      # khung trang pháp lý (PageShell + .pg-prose) + CONTACT_EMAIL/UPDATED_AT
    PageShell.tsx      # khung chung trang KHÔNG Canvas: PageSky (4 lớp trời + sao + đèn trời .ld-lantern) + hero (về cây, tiêu đề thư pháp/plainTitle, lead, stats, giờ HN) + tờ nội dung; data-sky cập nhật mỗi phút qua ref
    Icon.tsx           # icon nét SVG inline (currentColor) — THAY emoji làm icon ở mọi nơi
    Composer.tsx       # bảng viết: chọn theme + nhập text -> POST /api/wishes; chưa đăng nhập: CTA ít chữ (1 dòng + 3 nhãn icon + nút "Tiếp tục với Google" có vệt sáng quét CSS) và nút gửi đổi thành "Gửi ẩn danh"
    NavDock.tsx        # MENU dock tròn góc dưới-phải (icon SVG): xòe các mục (có "Điều ước của tôi" -> /tai-khoan) (Cây/Viết/Phòng ôn bài qua store; Kỹ năng sống -> router.push('/ky-nang')); ẩn khi roomOpen/composerOpen
    FocusHUD.tsx       # overlay phòng (tông mực trúc + nhấn vàng đèn): MẶC ĐỊNH THU GỌN (thanh mini: online + giờ Pomodoro + Rời phòng) — bấm mở bảng: số FLIP lớn = đếm ngược Pomodoro (màu theo phase), giờ Hà Nội 1 dòng nhỏ (ref), chọn 25/50 phút, Bắt đầu/Đặt lại, tên + Rời phòng; nút "Ra bàn thờ xin lời chúc" (walkTo shrine) + "Về chỗ ngồi"; mini bar có icon đèn khi được chúc phúc; ẩn khi shrineOpen; số online = sessions + bots
    ShrineHUD.tsx      # bảng BÀN THỜ (bottom sheet cùng tông FocusHUD): vái 3 lần (bowNonce + chuông WebAudio, 3 nén nhang sáng dần) -> rút 1 lời chúc/NGÀY giờ VN (lib/blessings, localStorage) + buff 60 phút; nút nổi "Vái tượng" khi nearShrine; toast hướng dẫn đi lại lần đầu
    LacBird.tsx        # <img> chim Lạc (public/chim-lac.jpg) + mix-blend-mode
    Toast.tsx
    WishStats.tsx      # huy hiệu dưới tiêu đề: "N điều ước trên cây" + "M đang chờ duyệt" (luôn hiện, kể cả 0; icon SVG) từ store.stats, bấm -> /dieu-uoc
    Loader.tsx         # màn chờ: chữ 'Cây Ước Nguyện' trên giấy dó (canvas 2D) + ĐÈN TRỜI bay lên (CSS thuần, mảng LANTERNS; mobile 5 chiếc; tan dần khi mở) → shader WebGL thuần MÀU NƯỚC LOANG mở ra cây 3D khi useScene.sceneReady (≥1.5s, tối đa 9s); không WebGL/reduce-motion → mờ dần; chỉ hiện 1 lần mỗi phiên (loaded)
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
  weather.ts           # Condition, SKIES, WX_VI, PRESETS (đèn/fog), randomDayWeather (nắng 55%/mây 27%/mưa 18%), randomWind
  skyPhase.ts          # mốc trời theo GIỜ VN (UTC+7): skyPhase dawn/day/dusk/night, vnClock, phaseFromUrl (?sky=), SKY_INIT_SCRIPT (inline ở layout, đặt <html data-sky> trước khi vẽ)
  windMaterial.ts      # makeWindMaterial(): MeshLambertMaterial + vertex shader gió GPU (.tick)
  profanity.ts         # containsProfanity + validateWish + validateComment (≤300) (giữ dấu, khớp theo TỪ; ưu tiên KHÔNG chặn nhầm)
  ratelimit.ts         # rate-limit theo IP (in-memory)
  runtime.ts           # windRef {current,target} + pointer {moved,dragging} + player (vị trí/hướng/ngồi/đích/phím/người khác) + walkTo() — chia sẻ KHÔNG re-render
  roomMap.ts           # BỐ CỤC map phòng Rừng Trúc (tất định): SHRINE_POS/FACE/STAND, POND, BAMBOO_CLUSTERS (né sân/bàn thờ/ao), vật cản tròn, resolveMove (đẩy khỏi vật cản + giới hạn WALK_R 22), steer (lách)
  blessings.ts         # 24 lời chúc (ấm áp, không phán vận hạn), BOWS_NEEDED=3, BUFF_MINUTES=60, vnDayKey, load/save/draw (localStorage 'wish-tree:blessing')
  funnyCollections.ts  # "bộ xàm xí": hằng số giới hạn + loadCollections (getAll điều ước, lọc status funny, không author)
  wishes.ts            # type Wish (+no, commentCount), SEED_WISHES (no 1..8), subscribeApproved() (onSnapshot, sort client)
  wishMeta.ts          # client+server: formatNo, formatWishTime (giờ VN), splitWishTime (cuống vé), WishProgress/PROGRESS_LABEL/isProgress, foldVi/searchTokens (bỏ dấu -> keywords), parseNoQuery, REPORT_REASONS, AUTO_HIDE_REPORTS
  wishServer.ts        # server-only: ensureNumbering (lần đầu đánh số TẤT CẢ ước cũ theo createdAt + keywords, rồi đặt meta/counters), counterRef, viewerFromRequest (verifyIdToken), publicWish
  firebase.client.ts   # init client SDK: getDb (đọc Firestore) + getAuthClient (Auth); null nếu thiếu env
  firebase.admin.ts    # init Admin SDK (server-only): getAdminDb + getAdminAuth (verifyIdToken)
  adminAuth.ts         # server-only: checkAdmin(req) — Bearer ID token + email_verified ∈ ADMIN_EMAILS, hoặc x-admin-secret
store/
  useScene.ts          # zustand: cond (thời tiết), wishes, stats (approved/pending), openWish, composerOpen, toast, loaded, roomOpen, sessions, nickname, navOpen, user, shrineOpen, bowNonce/bow(), blessedUntil, nearShrine
scripts/seed.mjs       # seed vài điều ước 'approved' vào Firestore
firestore.rules        # client read 'approved' (wishes) + read sessions; write = false (ghi qua Admin SDK)
firebase.json          # trỏ firestore.rules + firestore.indexes.json cho `firebase deploy`
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
   - **Có token hợp lệ** (đăng nhập Google/Facebook) → `getAdminAuth().verifyIdToken` → ghi doc `status:'approved'` + `uid` + `author=tên` → **hiện ngay** trên cây, KHỎI chờ duyệt. Ước có `uid` được đánh dấu `verified` (client `subscribeApproved` + `publicWish` chỉ trả boolean, KHÔNG lộ uid) → thẻ đọc + vé `/dieu-uoc` **lấp lánh** (`Sparkles`) để khuyến khích đăng nhập.
   - **Không/ token lỗi** (ẩn danh) → ghi `status:'pending'` như cũ.
3. **Đếm (minh bạch hàng chờ)**: client KHÔNG đọc được `pending` (rules) và `store.wishes` bị giới hạn `MAX_RENDER` → số liệu lấy từ `GET /api/wishes/stats` (count aggregation, server). `DataBridge` poll 60s → `useScene.stats` → `WishStats` (dưới tiêu đề) + dòng "hiện có M điều ước đang chờ" trong `Composer` khi ẩn danh. Gửi xong `bumpStats()` cộng tạm (optimistic), toast ẩn danh báo **vị trí trong hàng chờ** (= pending + 1); lần poll sau tự sửa số.
   - Lọc từ + rate-limit GIỮ NGUYÊN cho cả hai (auto-approve chỉ bỏ qua hàng chờ tay).
3. **Duyệt**: `/admin` đăng nhập Google → gửi `Authorization: Bearer <idToken>` → `checkAdmin` (verifyIdToken + email đã xác minh ∈ `ADMIN_EMAILS`; dự phòng header `x-admin-secret`) → `GET /api/admin/wishes?status=&page=` / `PATCH` → đặt `approved`/`rejected`/`pending`/`funny` + `reviewedAt`/`reviewedBy`. **Xàm xí** (`funny`): không lên cây, không phải "bỏ" — admin bấm "Xàm xí…", ghi lí do (`funnyNote`) → hiện ở `/xam-xi` (`GET /api/wishes/funny`, không kèm tên người viết). Khi `approved`, client `onSnapshot` tự thêm tờ mới → cây cập nhật realtime.
4. **Xem tất cả** (`/dieu-uoc`, `WishesView`): trang KHÔNG Canvas, gọi `GET /api/wishes/list?page=&theme=&q=&date=&sort=` (Admin SDK) → phân trang **ở server**. 3 chế độ: (a) `q` là `#888`/`888` → `where('no','==')`; (b) `q` là chữ → `searchTokens(q)`, `array-contains` từ DÀI nhất trên `keywords` (cap 500) rồi lọc tiếp mọi từ + chủ đề + ngày + sort trong bộ nhớ (khớp NGUYÊN TỪ, không dấu: "toan" = "Toán", nhưng "toa" không khớp "toán"); (c) còn lại: `where status [+theme] [+createdAt trong ngày theo giờ VN]` + `count()` + `orderBy('createdAt','desc').offset().limit()`; sort "cũ nhất" = lấy đoạn tương ứng tính từ cuối rồi đảo. State qua URL để share link + nút back.
5. **Số thứ tự #N**: cấp lúc GỬI (cả ẩn danh/pending → bị bỏ thì danh sách công khai có "lỗ" số, chấp nhận) trong transaction với `meta/counters.wishNo`. Lần đầu chạy (chưa có counter) `ensureNumbering` đánh số mọi điều ước cũ 1..k theo `createdAt` (tất định → nhiều instance chạy song song vẫn ra cùng số) — gọi ở POST wishes, list, admin.
6. **Bình luận**: subcollection `wishes/{id}/comments`. **Admin bình luận** (email đã xác minh ∈ `ADMIN_EMAILS`, server tự nhận qua `viewerFromRequest().admin`) → lưu `staff:true`, KHÔNG lưu ảnh Google; GET trả `author = adminDisplayName()` (env `ADMIN_DISPLAY_NAME`, mặc định "Người giữ cây") đọc lúc trả về → đổi env là đổi tên cả bình luận cũ; UI có dấu triện + nhãn "Giữ cây". `WishThread` GET (kèm token nếu có để biết `mine`) / POST (bắt buộc đăng nhập). `commentCount` trên doc điều ước (đọc realtime qua onSnapshot cho WishCard).
7. **Báo cáo**: `ReportButton` → `POST /api/reports` (bắt buộc đăng nhập; không báo nội dung của chính mình; mỗi tài khoản 1 lần/nội dung nhờ doc id `uid__wishId__commentId|wish`). `reportCount` tăng; đủ `AUTO_HIDE_REPORTS`=3 → điều ước về `pending` + `flagged` (rời cây ngay), bình luận `hidden` (+ giảm commentCount). Admin tab "⚑ Bị báo cáo": **Gỡ/Ẩn** (wish→rejected / comment hidden) hoặc **Bỏ qua** (flagged→approved lại, unhide); cả hai đánh dấu `reports.resolved`.

8. **Tài khoản / tiến độ** (`/tai-khoan`): `GET /api/me/wishes` (Bearer token → `where('uid','==')`, mọi trạng thái duyệt) · `PATCH` `{id, progress}` chỉ khi `doc.uid === viewer.uid`. `progress` là của NGƯỜI VIẾT, tách bạch với `status` (của admin). Dấu "Đã đạt" hiện công khai trên vé `/dieu-uoc` + WishCard (chỉ khi approved). Ước ẩn danh không có uid → không quản lí được. Lối vào: `AccountButton` (hình người, góc trên-phải trang chủ), NavDock, link "Ước của tôi" trong Composer.

**Đăng nhập (Google/Facebook):** `AuthBridge` (`onAuthStateChanged`) → `useScene.user`. `Composer` hiện nút đăng nhập Google/đăng xuất (nút Facebook **tạm ẩn** vì provider Facebook chưa bật trên Firebase — `signInFacebook` vẫn giữ trong `lib/auth.ts`); khi gửi, đính `getIdToken()` vào header. Client KHÔNG bao giờ tự ghi Firestore — server `verifyIdToken` mới là nơi quyết định `approved`.

Chưa cấu hình Firebase: `getDb()`/`getAuthClient()` trả null → dùng `SEED_WISHES`, Composer ẩn nút đăng nhập; `/api/wishes` trả 503 gọn; `/api/wishes/list` phân trang SEED trong JS.

### Thời tiết
KHÔNG gọi API thời tiết, KHÔNG có nút chuyển. `DataBridge` mỗi phút: `skyPhase()` (giờ VN, `?sky=` ghi đè để xem thử) = night → `'night'`, còn lại dùng `randomDayWeather()` (random lúc vào trang, đổi lại sau 15') → `useScene.setCond(cond)` + **`windRef.target = randomWind(cond)`** (lib/runtime). `useCondition()` = `cond`. `WeatherPanel` chỉ hiện icon + giờ VN. `SkyBackdrop`/`SceneEnv` đọc điều kiện đổi nền trời, đèn, fog, bật/tắt mưa.

### Gió (mỗi frame, KHÔNG re-render)
`SceneEnv` mỗi frame ease `windRef.current → windRef.target`. Các thành phần đọc `windRef.current`:
- Cỏ/cỏ lau/trúc: **GPU** — `makeWindMaterial(...).tick(time, wind)` chỉ set 1 uniform/frame (vertex shader uốn đỉnh). Đây là lý do cỏ dày vẫn mượt mobile.
- DecorPapers/WishPapers/Blossoms/Dew/Critters: cập nhật ma trận/điểm bằng JS (số lượng nhỏ, giảm theo mobile).

### Phòng Rừng Trúc / presence (thiền viện)
Bấm **thiền viện** (`Monastery`, trên đỉnh núi xa) → `useScene.setRoomOpen(true)`. `WishTreeCanvas` ẩn cảnh cây (`<group visible={!roomOpen}>`, KHÔNG unmount) và bật `<FocusRoom active>`; `CameraRig` nhận `disabled={roomOpen}` (ngừng ghi camera) để `RoomCamera` tiếp quản. Cảnh phòng = MAP ĐI DẠO (bán kính 22m): sân giữa có vòng người ngồi thiền, bàn thờ đá ở hậu cảnh, ao sen, rừng trúc thành khóm + bụi cây/dương xỉ Poly Haven; nhân vật của mình đi lại (Player) + (HUD HTML) đồng hồ flip, Pomodoro, bảng bàn thờ. Vị trí nhân vật CHỈ ở client (không gửi presence) — người khác vẫn thấy mình ngồi ở ghế.

Presence (giống mô hình điều ước: **client đọc, server ghi**):
1. **Ghi**: `PresenceBridge` (chỉ khi `roomOpen`) gửi `heartbeat` ngay + mỗi `HEARTBEAT_MS` (28s) → `POST /api/presence` → Admin SDK `set` doc `sessions/{clientId}` với `lastSeen=serverTimestamp` (và `joinedAt` CHỈ khi doc chưa tồn tại). Đóng tab/ẩn tab → `navigator.sendBeacon('/api/presence', {action:'leave'})` (route đọc cả body `text/plain`).
2. **Đọc**: `subscribeSessions` (`lib/presence`) `onSnapshot(query(sessions, orderBy('lastSeen','desc'), limit(40)))` (index đơn trường, không cần composite) → lọc client `now - lastSeen < STALE_MS` (65s, ẩn "ma" khi đóng tab cứng) + sort theo `joinedAt` → chỉ `useScene.setSessions` khi chữ ký danh sách đổi. `Meditators` render avatar instanced; **đồng hồ phiên = `now - joinedAt` tính ở client mỗi giây** (0 ghi Firestore).
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
{ no: number,            // số thứ tự #N (cấp lúc gửi, xem meta/counters)
  text: string(<=160), theme: ThemeKey, author?: string,
  keywords: string[],    // searchTokens(text): từ bỏ dấu, cho tìm kiếm array-contains
  uid?: string,  // có khi gửi bởi người đăng nhập Google/Facebook (-> auto-approve)
  status: 'pending'|'approved'|'rejected'|'funny', createdAt: serverTimestamp,
  funnyNote?: string,    // chỉ khi status 'funny': lí do không duyệt RIÊNG (admin ghi), hiện công khai ở /xam-xi
  funnyGroup?: string,   // id "bộ xàm xí" (funnyCollections) -> không có funnyNote thì dùng lí do chung của bộ
  commentCount: number, reportCount: number,
  progress?: 'trying'|'achieved', // CHÍNH người viết tự đánh dấu ở /tai-khoan (thiếu = trying); publicWish/subscribeApproved chỉ trả `achieved` boolean
  achievedAt?: serverTimestamp,   // khi đánh dấu achieved (xoá khi về trying)
  flagged?: boolean,     // true = TỰ ẩn do đủ báo cáo (status về pending), chờ admin
  reviewedAt?: serverTimestamp, reviewedBy?: string }  // ghi khi admin đổi trạng thái

// funnyCollections/{id}  ("bộ xàm xí", chỉ Admin SDK; rules mặc định chặn client)
{ title, note /* lí do chung */, wishIds: string[2..6], createdAt, createdBy }
// Tờ trong bộ có wishes.funnyGroup = id bộ, CHỈ hiện ở tab Bộ sưu tập (không lặp ở Từng tờ); funnyNote riêng không bắt buộc.
// Tờ rời trạng thái 'funny' (PATCH khác) -> xoá funnyGroup + funnyNote, tự bị lọc khỏi bộ lúc đọc; bộ hết tờ thì ẩn.

// wishes/{id}/comments/{cid}
{ text: string(<=300), uid, author, photo?, hidden: boolean, reportCount: number, createdAt }
// reports/{uid__wishId__commentId|wish}
{ type: 'wish'|'comment', wishId, commentId: string|null, uid, reporter, reason, resolved, resolution?, resolvedBy?, createdAt }
// meta/counters
{ wishNo: number }  // số lớn nhất đã cấp
```
`comments`, `reports`, `meta` KHÔNG có rule → client không đọc/ghi được (mọi thứ qua API + Admin SDK).
Rules (`firestore.rules`): client `read` chỉ khi `status=='approved'`; `write:false` (mọi ghi qua Admin SDK). Query realtime của cây **không orderBy** (tránh composite index) — sort theo `createdAt` ở client. **Ngoại lệ:** trang `/dieu-uoc` phân trang ở server (`/api/wishes/list`) DÙNG `orderBy('createdAt')` + `where` → cần composite index, khai báo ở `firestore.indexes.json` (xem Gotchas).

### Firestore `sessions` (presence phòng Rừng Trúc)

```ts
// doc id = clientId
{ clientId: string, name: string(<=24),
  joinedAt: serverTimestamp,  // đặt 1 lần -> đếm giờ phiên ở client
  lastSeen: serverTimestamp,  // cập nhật mỗi heartbeat -> lọc staleness 65s
  pomo?: { phase: 'focus'|'break'|'idle', endsAt: number } }  // (tuỳ chọn, chưa broadcast)
```
Rules: `read: if true` (không chứa PII), `write: false` (ghi qua `/api/presence`). Đọc `orderBy(lastSeen) limit(40)` → lọc staleness + sort ở client. Lượng ghi ≈ N người × 1 ghi/28s; đồng hồ giây = client tính từ `joinedAt` → 0 ghi. (Tuỳ chọn dọn ghost: Firestore TTL trên `lastSeen`.)

## 7. Biến môi trường (`.env.local`, mẫu `.env.local.example`)

- `NEXT_PUBLIC_FIREBASE_*` (6 biến) — client đọc Firestore (công khai, an toàn).
- `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` — Admin SDK (server-only). Code xử lý `\n` an toàn (`.replace(/\\n/g,'\n')`).
- `ADMIN_EMAILS` — (tuỳ chọn) email Google được vào `/admin`, phân tách dấu phẩy; mặc định `khuctruonghuy2000@gmail.com` (hardcode trong `lib/adminAuth.ts`).
- `ADMIN_SECRET` — (tuỳ chọn) mã dự phòng cho API admin qua header `x-admin-secret`; UI không còn ô nhập mã.
- `ADMIN_DISPLAY_NAME` — (tuỳ chọn) tên hiển thị khi admin bình luận; mặc định "Người giữ cây".

**Đăng nhập Google/Facebook KHÔNG cần biến env mới** — dùng lại `NEXT_PUBLIC_FIREBASE_*` (client) + creds Admin (`verifyIdToken`). Nhưng **CẦN cấu hình Firebase Console**: bật provider Google & Facebook (Facebook cần tạo Facebook Developer App, dán App ID/secret + OAuth redirect), và thêm **Authorized domains** (localhost + domain Vercel). Presence phòng Rừng Trúc vẫn ẩn danh, không liên quan Auth này.

Vercel: import `.env.local` khi tạo project.

## 8. Gotchas (đọc trước khi sửa)

- **CTA đăng nhập ở bản dev không Firebase**: `Composer` hiện khối đăng nhập khi `isFirebaseConfigured` HOẶC `NODE_ENV !== 'production'` (để xem giao diện khi chưa có `.env.local`); bấm Google lúc đó chỉ báo toast. Prod thiếu Firebase thì vẫn ẩn.
- **ESLint**: Next 16 bật rule React-Compiler (`purity`/`immutability`/`set-state-in-effect`) báo nhầm với code Three.js (Math.random trong useMemo, mutate buffer trong useFrame). Đã **tắt cho `components/three/**`** + vài file UI trong `eslint.config.mjs`. Đừng "sửa" các cảnh báo này bằng cách viết lại — chúng cố ý.
- **Loader màu nước**: `WishTreeCanvas.onCreated` đợi 2 rAF rồi `setSceneReady(true)` → Loader mới loang mở. Nền giấy + chữ + con dấu vẽ **1 lần** vào canvas 2D (đợi `document.fonts.ready`, đo vị trí chữ HTML để vẽ đúng chỗ, rồi crossfade) → làm texture cho fragment shader (1 tam giác full màn hình, ~3.2s, xong thì `loseContext`). Lòng vết trong suốt đi **trễ** sau mép màu (2 ngưỡng `t` và `t-.2`) để luôn thấy dải màu loang. **KHÔNG bật `gl.BLEND`** (canvas `premultipliedAlpha:false`) — bật sẽ ra viền tối quanh vùng trong suốt.
- **Firebase Auth – Authorized domains**: mọi tên miền chạy app (`cayuocnguyen.io.vn`, `www.` nếu có, domain `*.vercel.app`, `localhost`) PHẢI có trong Firebase Console → Authentication → Settings → Authorized domains; thiếu → popup Google đóng ngay, lỗi `auth/unauthorized-domain` (Composer toast báo riêng theo mã lỗi).
- **Xem thử lấp lánh khi dev**: chưa có `.env.local` (không Firebase) thì chỉ có `SEED_WISHES`; ở `NODE_ENV !== 'production'` các tờ mẫu #1, #4, #7 được đặt `verified: true` để thấy hiệu ứng `Sparkles`. Prod luôn false.
- **Trang cuộn được**: `html, body { overflow: hidden }` (cho Canvas 3D) → mọi trang nội dung dài (`/dieu-uoc`, `/ky-nang`, `/admin`, trang pháp lý) phải tự có khung `position: fixed; inset: 0; overflow-y: auto`, nếu không sẽ KHÔNG cuộn được.
- **Canvas SSR**: phải `dynamic(..., { ssr:false })` từ client component (HomeClient). Không import trực tiếp ở server component.
- **Chim Lạc**: `public/chim-lac.jpg` là ảnh ĐEN/nền TRẮNG; nền trắng được bỏ bằng `mix-blend-mode: multiply` (xem `.composer-head .lac`, `.lac-watermark` trong globals.css, dùng ở `LacBird.tsx`). Muốn đổi màu chim cần CSS filter. Lưu ý: ẢNH OG/favicon KHÔNG dùng file này (chim Lạc vẽ lại bằng SVG silhouette vì satori không hỗ trợ `mix-blend-mode` để bỏ nền trắng).
- **Ảnh OG + icon sinh động (next/og)**: `app/opengraph-image.tsx` vẽ bằng satori — chỉ hỗ trợ flexbox + inline-style + `<svg>` cơ bản (KHÔNG `mix-blend-mode`, gradient text, filter…). Chữ Việt có dấu cần **nhúng font TTF** đọc bằng `readFile(join(process.cwd(),'app/_fonts/...'))` — font mặc định Geist thiếu dấu. Đổi tiêu đề/khẩu hiệu thì sửa trực tiếp trong file; test bằng `curl localhost:3000/opengraph-image -o og.png`. `twitter-image.tsx` chỉ re-export. **Logo**: gốc `public/logo.png` (512×512, cũng là logo trên Google OAuth consent screen — bản 120×120); `app/icon.png` + `app/apple-icon.png` là bản thu nhỏ (xuất bằng `sharp`). Đổi logo → xuất lại cả 3 file. OG nhúng logo dạng data URL (`readFile` → base64) vì satori không đọc đường dẫn tương đối.
- **Click vs xoay**: `WishPapers`/`CalligraphyDesk` onClick bỏ qua nếu `pointer.moved > 7` (lib/runtime) để không mở khi đang orbit.
- **Bấm tờ ước nguyện = hộp va chạm VÔ HÌNH, KHÔNG phải mặt giấy**: mặt giấy là `PlaneGeometry` nhỏ + xoay `yaw` ngẫu nhiên → nghiêng cạnh về camera thì raycast trượt → bấm không trúng. Click gắn vào `hitRef` (InstancedMesh `BoxGeometry` to hơn, có chiều sâu, material `opacity:0 depthWrite:false`) đặt CÙNG ma trận với tờ giấy mỗi frame. **KHÔNG** dùng `visible={false}` cho hộp này (raycaster bỏ qua object ẩn). Đổi kích thước tờ giấy thì cân nhắc chỉnh `hitGeo`. **BẮT BUỘC** đặt `hit.boundingSphere = null` trong `useFrame` (vì `instanceMatrix` đổi mỗi frame nhưng `InstancedMesh` chỉ tính boundingSphere lazy 1 lần → kẹt ở gốc toạ độ → raycast loại tia sớm → cả cụm tờ giấy mất click, xem Nhật ký lỗi) + `frustumCulled={false}`.
- **Vị trí điều ước tất định**: dựa trên `anchorFor(id, theme)` — đừng đổi seed/PRNG nếu không muốn mọi tờ đổi chỗ.
- **Lọc từ**: `lib/profanity.ts` cố ý GIỮ DẤU và khớp theo TỪ nguyên vẹn để tránh chặn nhầm ("buổi", "lớn", "ngủ"…). Hàng chờ duyệt là lớp chặn thứ hai.
- **Đặt vật thể ngoài đỉnh phẳng** (thông, nhà, đá): PHẢI lấy y từ `terrainHeight(x,z)` (`lib/terrain`) nếu không sẽ lơ lửng/chìm vào sườn dốc. Đỉnh phẳng có bán kính `rEdgeAt(ang)` (~6.7–11.3); để vùng cây/cỏ/bàn gọn trong rìa, vật nền (rừng/xóm) đặt từ r≈16 trở ra.
- **HỆ BÁM ĐẤT ("trọng lực" nhẹ)**: MỌI vật đặt trên đất phải lấy Y từ `groundHeight(x,z)` (KHÔNG hardcode `y=0`). Vật rải trên sườn nên nghiêng theo `slopeQuaternion(x,z,blend)` (quay +Y về pháp tuyến `terrainNormal`, `blend` 0.5–0.6 để nghiêng vừa) cho cảm giác trọng lực tự nhiên. **Tính 1 LẦN lúc dựng cảnh** (bake vào ma trận instance trong `useLayoutEffect`/`useMemo`), KHÔNG gọi mỗi frame → 0 chi phí runtime, an toàn mobile. KHÔNG dùng engine vật lí thật (rapier/cannon) — thừa cho cảnh tĩnh + vi phạm nguyên tắc no-lag.
- **Cảnh tĩnh phải TẤT ĐỊNH (không đổi giữa các lần load)**: cỏ/cỏ lau/hoa (Meadow), rừng thông (Scenery), tán lá + cành (Foliage), tảng đá (Ground) đều rải bằng `mulberry32(seed)` với **seed cố định**, KHÔNG dùng `Math.random` trực tiếp. `makeRock(seed)` và `makeBranch({rng})` nhận nguồn ngẫu nhiên qua tham số. Đừng thay lại bằng `Math.random` (sẽ làm cảnh nhảy mỗi lần tải).
- **Đổi cảnh dùng 1 Canvas**: phòng Rừng Trúc KHÔNG mở Canvas thứ hai (tránh 2 WebGL context gây stall mobile). Cảnh cây bị `visible={false}` (KHÔNG unmount → vào lại tức thì) nhưng `useFrame` vẫn chạy; chỉ MỘT camera rig ghi `camera.position` (gate qua `roomOpen`/`disabled`). `Monastery` import `peakCenter` từ `lib/peaks` (KHÔNG từ `Scenery`) để tránh import vòng.
- **Thiền viện ở xa (~r80)**: glow sprite dùng `sizeAttenuation:false` để giữ kích thước/vùng-chạm ổn định trên màn dù xa; click bỏ qua nếu `pointer.moved > 7` như các onClick khác.
- **Presence ghi/ma**: heartbeat 28s, ẩn phiên nếu `now-lastSeen ≥ 65s` (lọc ở client). Đóng tab cứng không kịp `leave` → biến mất sau ≤65s. `sendBeacon` gửi `text/plain` nên route `/api/presence` đọc `req.text()` rồi `JSON.parse`. Rate-limit presence nới rộng (`30/phút`, key theo `clientId:ip`) — mặc định 5/10ph sẽ chặn nhầm heartbeat.
- **Nhãn avatar = sprite canvas, KHÔNG drei `<Html>`**: mỗi avatar 1 `CanvasTexture` vẽ lại **1 lần/giây** (throttle trong `useFrame`) → không tạo DOM/giây/avatar gây jank mobile. Số avatar cap `CAP=24` (dư ẩn).
- **Raycast trúng vật đang ẩn**: cảnh cây chỉ `visible=false` khi vào phòng (không unmount) và three Raycaster KHÔNG bỏ qua vật ẩn → handler click/hover của CalligraphyDesk, Monastery, WishPapers phải tự `return` khi `roomOpen` (và Shrine khi `!roomOpen`). Thiếu là chạm đất trong phòng mở nhầm bảng viết điều ước. Thêm vật bấm được mới thì nhớ guard.
- **Asset Poly Haven** (public/room/ + public/scene/, CC0). Mô hình CÂY của Poly Haven là scan hàng trăm MB → KHÔNG dùng cho web; rừng xa tự dựng. Đá: `--simplify-ratio 0.06 --simplify-error 0.01` (boulder_01 không giảm được, đã bỏ). Material có texture thật được tạo trong useMemo rồi component Suspense gắn map vào (không remount mesh): tải qua `api.polyhaven.com/files/<id>`, nén bằng `npx @gltf-transform/cli@4 optimize in.gltf out.glb --compress false --texture-compress webp --texture-size 512 --simplify true --simplify-ratio 0.25`; texture `cwebp`. Model lấy mesh đầu tiên làm instancedMesh (áp matrixWorld vào geometry), chuẩn hoá chiều cao theo bounding box. Tổng ~880KB, chỉ tải khi vào phòng (Suspense).
- **Phòng đông người không lag**: `subscribeSessions` nghe `orderBy(lastSeen desc) limit(40)` (index đơn trường, tự có) và CHỈ gọi callback khi chữ ký (id|tên|joinedAt|pha pomo) đổi — heartbeat chỉ đổi lastSeen nên không re-render; quét phiên "ma" mỗi 10s. Heartbeat 28s / STALE 65s. Vẽ tối đa 14 người (mobile 9), MÌNH luôn đứng đầu (không bị cắt, ghế cố định góc 0), người khác trượt mượt khi đổi ghế, vòng ghế nới theo số người; nhãn xa >11m ẩn + ngừng vẽ canvas. Đi lại/vái/hiệu ứng chỉ ở client → số người không làm tăng tải.
- **Chi phí Firestore**: mỗi heartbeat = 1 lượt đọc cho MỌI người đang nghe (≈ N²/28 đọc/giây). Nếu phòng thường xuyên >100 người, cân nhắc gom presence vào 1 doc tổng hợp do server cập nhật khi vào/ra.
- **Mở bản dev từ điện thoại (LAN)**: Next 16 chặn tài nguyên dev từ hostname lạ → trang kẹt ở màn chờ (JS không chạy). `next.config.ts` có `allowedDevOrigins: ['192.168.*.*', '10.*.*.*']` (chỉ ảnh hưởng dev). Đổi config phải khởi động lại `npm run dev`.
- **Mực loang phủ hồng cả màn điện thoại**: dải màu nước trong shader Loader đo theo CHIỀU CAO màn hình → màn dọc hẹp bị phủ kín. Giờ: lòng vết trong suốt NGAY sau dải mép hẹp (uniform `lag` ~0.07 dọc / 0.11 ngang, không còn lớp màu vương), canvas mực loang chạy ở NỬA độ phân giải (fbm nhiều lớp full-res làm iPhone tụt khung → khung hồng đứng lâu), màn dọc loang nhanh hơn 20%. Sửa shader thì so thử ở khung dọc 390×844.
- **Màn chờ lộ nền xám hồng**: nếu báo sceneReady chỉ sau 2 khung hình từ onCreated thì điện thoại mở màn chờ khi asset còn đang tải / shader đang biên dịch (canvas trong suốt → thấy nền #sky). Giờ SceneWarmup chờ asset + compileAsync. Thêm asset mới cho cảnh cây → thêm URL vào SCENE_TEXTURES/ROCK_MODELS để màn chờ đợi nó.
- **Lá cây (leaves.webp)**: atlas lá Poly Haven KHÔNG dùng thẳng được (dính mẩu cuống/viền xám vì để dán lên model của nó) → lấy ảnh lá ĐƠN + ảnh alpha riêng (`leaves_alpha`, vì diff là JPG không có alpha) rồi ghép bằng `sharp` thành chùm lá trên cành (`scripts/leafcard.cjs`: xoay lá so le dọc cành SVG; khung lá BOXES lấy từ vùng liền của alpha). Muốn đổi kiểu lá: ghép lại atlas 1024×512 (2 ô).
- **Ánh sáng cảnh cây**: ban ngày (nắng/mây/mưa) mặt trời không thấp hơn 14° và `daylight` ≥ 0.6 (chiều muộn không tối sầm); đêm giữ tối, nhờ TreeLantern rọi gốc cây. Thêm đèn điểm mới thì cân nhắc: mỗi pointLight cộng chi phí cho MỌI material lit trong cảnh.
- **Nhân vật**: `dt` kẹp 0.1s (máy yếu/fps thấp vẫn đi đúng tốc độ); kẹt >1s thì bỏ đích. Va chạm khóm trúc dùng `setBambooCount` để khớp số khóm Bamboo vẽ (mobile ít hơn).
- **ESLint**: thêm `components/PresenceBridge.tsx` + `components/ui/FocusHUD.tsx` vào danh sách tắt `set-state-in-effect` (đồng bộ localStorage/timer). Ghi ref trong render bị `react-hooks/refs` chặn → cập nhật ref trong `useEffect`.
- **Auto-approve do SERVER quyết định, KHÔNG tin client**: client chỉ đính `Authorization: Bearer <ID token>`; `/api/wishes` `verifyIdToken` rồi mới đặt `status:'approved'`. Token sai/hết hạn → tự rớt về `pending`. Đừng để client gửi thẳng `status` (sẽ bị giả mạo). Client vẫn KHÔNG bao giờ ghi Firestore trực tiếp (`firestore.rules` `write:false`).
- **`/dieu-uoc` cần composite index (ngoại lệ có chủ đích)**: cây dùng query không-orderBy để né index, nhưng phân trang số ở server BẮT BUỘC `orderBy('createdAt')` + `where('status')` [+ `where('theme')`] → 2 composite index trong `firestore.indexes.json`. Tạo bằng `firebase deploy --only firestore:indexes` HOẶC bấm link Console mà Firestore tự gợi ý ở lần query đầu (báo lỗi `FAILED_PRECONDITION`). Thiếu index → `/api/wishes/list` lỗi.
- **`offset()` của Firestore tính phí cả doc bị skip**: phân trang `/api/wishes/list` dùng `offset((page-1)*PAGE_SIZE)`; trang càng sâu càng tốn đọc. Chấp nhận ở quy mô này; nếu dữ liệu lớn hẳn, đổi sang cursor `startAfter`.
- **`/dieu-uoc` dùng `useSearchParams` → phải bọc `<Suspense>`** (Next App Router yêu cầu) — đã bọc trong `app/dieu-uoc/page.tsx`. Trang này KHÔNG mount Canvas (giống `/ky-nang`) để nhẹ pin. `WishesView.tsx` được thêm vào danh sách tắt `set-state-in-effect` trong `eslint.config.mjs` (đặt `loading` đồng bộ khi đổi `page`/`theme` — pattern fetch giống `app/admin/page.tsx`).
- **Bình luận/báo cáo/số thứ tự KHÔNG cần index mới**: `no ==` (đơn), `status == + keywords array-contains` (index merging), ngày = range trên `createdAt` dùng lại index (status[,theme],createdAt), báo cáo admin chỉ `orderBy createdAt` rồi lọc `resolved` trong bộ nhớ, resolve dùng 2 điều kiện `==`. Giữ như vậy khi sửa — thêm `orderBy` khác field sẽ đòi composite index.
- **`set-state-in-effect`**: gọi một hàm `load()` (useCallback có setState) trong `useEffect` cũng bị chặn → `WishThread`/`ReportsPanel` fetch thẳng trong effect, setState chỉ trong `.then`, tải lại bằng state `nonce`.
- **App GIỜ CÓ dùng Firebase Auth**: phải thêm Authorized domains trong Firebase Console (localhost + domain Vercel) nếu không `signInWithPopup` báo `auth/unauthorized-domain`. (Ghi chú cũ "không dùng Auth" đã hết hiệu lực.)

- **Google OAuth verification**: consent screen khai home page = `/gioi-thieu` (KHÔNG dùng `/`: trang chủ là Canvas 3D + loader, HTML chứa chữ "Đăng nhập… Google" của Composer → bot Google kết luận "home page behind login" + "không nêu mục đích"). App name trên consent screen phải khớp đúng "Cây Ước Nguyện". Trang chủ có link Giới thiệu · Bảo mật · Điều khoản dưới tiêu đề (`.brand-links`).

- **Trang nội dung KHÔNG Canvas dùng `PageShell` + `app/pages.css`** (trời đèn trời theo giờ VN, vé cuống|thân). Màu qua biến `--pg-*` trên `.pg`; đêm (`<html data-sky="night">`) đổi cả bộ biến. `WishThread` dùng chung với `WishCard` trên cây nên mọi `var(--pg-*)` trong `.wt-*` đều có fallback màu trang chủ.
- **Không dùng emoji làm icon/trang trí** (thiết kế theo skill Impeccable, chống "AI slop"): dùng `components/ui/Icon.tsx`. Không chuỗi "A · B · C", không chữ IN HOA giãn chữ. Định hướng thiết kế ở `PRODUCT.md` + `.impeccable/`.
- **`<html data-sky>` đặt bởi script inline** (`SKY_INIT_SCRIPT` trong `<head>`, `suppressHydrationWarning` trên `<html>`) để trời đúng mốc ngay khung hình đầu, không nháy.

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
- **Bấm tờ giấy đỏ KHÔNG đọc được ước nguyện**: click gắn trực tiếp vào mặt giấy (`PlaneGeometry` 0.2×0.28) xoay `yaw` ngẫu nhiên → ở góc nghiêng cạnh, mục tiêu raycast gần như bằng 0 nên bấm trượt liên tục. Sửa: thêm **InstancedMesh hộp va chạm vô hình** (`hitRef`, `BoxGeometry` 0.34×0.5×0.22, `opacity:0 depthWrite:false`, KHÔNG `visible={false}`) đặt cùng ma trận với tờ giấy mỗi frame, chuyển `onClick` (+ con trỏ pointer) sang hộp này. → `WishPapers.tsx`.
- **Bấm tờ giấy VẪN không đọc được → còn "nhảy sang trang khác" (mở phòng/bàn)**: hộp va chạm `hitRef` cập nhật `instanceMatrix` mỗi frame (tờ giấy đung đưa) nhưng `THREE.InstancedMesh` chỉ tính `boundingSphere` **1 lần (lazy)**; nếu lần tính rơi vào frame 0 (ma trận còn identity) → cầu kẹt ở **gốc toạ độ** (r≈0.58) thay vì bao 9 tờ (tâm y≈2.9, r≈3.9). `InstancedMesh.raycast` kiểm tra `ray.intersectsSphere(boundingSphere)` TRƯỚC → cầu sai → **loại tia sớm → KHÔNG tờ nào nhận click**; click xuyên qua → trúng `Monastery`(→`setRoomOpen`) hoặc `CalligraphyDesk`(→`setComposerOpen`) phía sau → cảnh đổi như "sang trang". Verify bằng Playwright: `intersectsBeforeRecompute:0` → sau `computeBoundingSphere()` → `1`. Sửa: trong `useFrame` đặt `hit.boundingSphere = null` mỗi frame (ép raycast tính lại từ ma trận hiện tại, chỉ chạy lúc bấm — rẻ) + `frustumCulled={false}` cho hộp + nới hộp lên `0.46×0.64×0.34` (tờ giấy ở xa chỉ ~8–18px, đung đưa + camera tự xoay nên dễ trượt). Playwright sau sửa: **9/9 tờ mở đúng thẻ ước**. → `WishPapers.tsx`.

## 9. Lệnh & deploy

```bash
npm run dev     # http://localhost:3000 (LAN để test mobile cùng wifi)
npm run build   # bản production (Turbopack)
npm run lint    # eslint
npm run seed    # seed điều ước mẫu vào Firestore (cần FIREBASE_* trong .env.local)
```
- Repo: github.com/dken19/wish-tree (SSH). **Push `master` → Vercel auto-deploy** (production); PR → preview.
- CI: `.github/workflows/ci.yml` chạy lint + build (không cần secret — build có fallback).
