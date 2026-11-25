---
version: 1
slug: "app-dieu-uoc-wishesview-tsx"
primary_target: "app/dieu-uoc/WishesView.tsx"
related_targets: ["app/ky-nang/SkillsView.tsx","components/ui/LegalPage.tsx","app/gioi-thieu/page.tsx"]
---

# Trang nội dung (dieu-uoc, ky-nang, gioi-thieu, chinh-sach-bao-mat, dieu-khoan)

Scope: các route KHÔNG mount Canvas. Mode: Read (/dieu-uoc thêm tìm/lọc). Build path: code-led (không có công cụ tạo ảnh).

Audience/job: người Việt mọi lứa tuổi, chủ yếu trên điện thoại: lướt và đọc điều ước của người khác, tìm điều ước theo số hoặc từ khoá, học một kỹ năng, đọc điều khoản. Người dùng nhấn mạnh: phải DỄ DUYỆT (lướt, quét, tìm) điều ước.

## Direction contract

THESIS: Mỗi điều ước là một tấm vé số kiến thiết cầu may: cuống vé mang số seri #N và giờ gửi như ngày mở thưởng, thân vé là lời ước. Từ chối lưới card bo góc đổ bóng, gradient trang trí, emoji làm icon.

OWN-WORLD: Trời đèn trời 4 mốc giờ Hà Nội phía sau. Tờ nội dung nền xám xanh #f4f7f5; vé giấy #e6efe9, cuống phủ hoa văn guilloche mảnh và tô nhạt màu chủ đề, đường răng cưa đứt nét + 2 khuyết tròn giữa cuống và thân; số seri đỏ #c8102e đậm, số tabular; dấu mộc xanh #1d3f8f nghiêng cho trạng thái. Đêm: nền #0d131c, vé #17221e, seri vàng đèn #f2b555. Tiêu đề thư pháp Dancing Script, thân Be Vietnam Pro.

STORY: Người đọc biết ngay đang ở đâu (trời đúng giờ Hà Nội), lướt một cột vé đọc lời ước to rõ, bấm số vé để mở đúng điều ước, lọc theo chủ đề/ngày, mở bình luận hoặc báo cáo ngay trên vé.

FIRST VIEWPORT: Dải trời ~34vh: link về cây, tiêu đề thư pháp, câu dẫn, dòng giờ Hà Nội. Tờ nội dung bo trên 18px: ô tìm (hành động chính, nút đỏ) đầu tờ, chip chủ đề, rồi vé đầu tiên lọt màn hình đầu trên điện thoại.

FORM: assigned direction, position 7 of the ordered grounded list, seed:3b077de30f2aca2a. Raises: chỉ thứ bấm được mang màu đỏ seri (từ warm-app); trạng thái là dấu mộc, không đổi màu cả vé (từ cutting-bench); một lưới cuống | thân cai mọi hàng, cả kỹ năng sống (từ crouwel).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Memorable moment
Đèn trời bay qua dải trời phía sau tiêu đề; về đêm cả trang chuyển tông tối và số seri chuyển vàng đèn.

## Unresolved
- Trang chủ (Canvas, WishCard, Composer) ngoài phạm vi; WishThread dùng chung phải vẫn ổn trên WishCard.
- Tránh mọi chữ "trúng thưởng/xổ số" trong nội dung (rủi ro gợi cờ bạc).
