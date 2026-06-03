<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Cây Ước Nguyện — bản đồ dự án nhanh

Trang chủ là **cây 3D treo điều ước (giấy đỏ)**, có gió + thời tiết Hà Nội, đồng cỏ/bướm/chuồn chuồn/sương, bàn thư pháp để viết điều ước, hoạ tiết chim Lạc. Người dùng gửi điều ước → lọc từ + duyệt tay → hiện realtime trên cây.

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · React Three Fiber v9 + drei + three 0.184 · Zustand · Firebase (client đọc Firestore, Admin SDK ghi/duyệt) · next/font.

**Nguyên tắc cốt lõi: KHÔNG được lag trên mobile.** Gió cỏ chạy GPU (vertex shader), mọi thứ instanced, số lượng giảm theo `useIsMobile()`, có `AdaptiveDpr`.

👉 **Đọc [ARCHITECTURE.md](ARCHITECTURE.md) để hiểu đầy đủ cấu trúc, luồng dữ liệu, và các "gotcha" trước khi sửa code.**

Lệnh: `npm run dev` (cổng 3000) · `npm run build` · `npm run lint` · `npm run seed` (seed Firestore). Cấu hình ở `.env.local` (mẫu: `.env.local.example`). Deploy: push `master` → Vercel tự deploy; CI ở `.github/workflows/ci.yml`.
