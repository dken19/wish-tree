// Trạng thái runtime nhẹ, dùng chung giữa các component three mà KHÔNG gây re-render.
// (gió & con trỏ cập nhật mỗi frame nên không đặt trong React state)

export const windRef = { current: 0.9, target: 0.9 }

// Theo dõi kéo chuột để phân biệt "xoay cây" với "click đọc điều ước"
export const pointer = { moved: 0, dragging: false }
