// Trạng thái runtime nhẹ, dùng chung giữa các component three mà KHÔNG gây re-render.
// (gió & con trỏ cập nhật mỗi frame nên không đặt trong React state)

export const windRef = { current: 0.9, target: 0.9 }

// Theo dõi kéo chuột để phân biệt "xoay cây" với "click đọc điều ước"
export const pointer = { moved: 0, dragging: false }

// ----- Nhân vật của mình trong phòng Rừng Trúc (đi lại được) -----
// Cập nhật mỗi frame ở PlayerController; Meditators đọc để vẽ. KHÔNG đặt trong React state.
export const player = {
  x: 0,
  z: 0,
  yaw: 0,
  moving: false,
  /** 0 = đứng/đi, 1 = ngồi thiền (lerp mượt) */
  sit: 1,
  ready: false, // đã đặt về ghế lần đầu
  seatX: 0,
  seatZ: 0,
  tx: 0,
  tz: 0,
  hasTarget: false,
  /** đi tới nơi thì làm gì: 'shrine' mở bảng vái, 'seat' ngồi xuống */
  goal: null as null | 'shrine' | 'seat',
  keys: { f: 0, b: 0, l: 0, r: 0 },
  idle: 0, // giây đứng yên
  /** người khác đang ngồi (va chạm) — Meditators cập nhật */
  others: [] as { x: number; z: number; r: number }[],
}

/** Bảo nhân vật đi tới bàn thờ / về ghế / một điểm trên đất. */
export function walkTo(goal: 'shrine' | 'seat' | { x: number; z: number }) {
  if (typeof goal === 'object') {
    player.tx = goal.x
    player.tz = goal.z
    player.goal = null
  } else {
    player.goal = goal
    player.tx = NaN // PlayerController tự điền đích theo goal
  }
  player.hasTarget = true
}
