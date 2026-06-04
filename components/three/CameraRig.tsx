'use client'
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { pointer } from '@/lib/runtime'

// Điều khiển camera orbit + pinch tự viết (nhẹ, không dùng OrbitControls).
// Tự xoay nhẹ khi không tương tác. Port từ prototype.
// `disabled`: khi đang ở phòng Rừng Trúc, RoomCamera tiếp quản -> rig này ngừng
// ghi camera & bỏ qua tương tác (chỉ MỘT rig ghi camera tại một thời điểm).
export default function CameraRig({ disabled = false }: { disabled?: boolean }) {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)

  const s = useRef({
    target: new THREE.Vector3(0, 2.4, 0),
    theta: 0.5,
    phi: 1.12,
    radius: 9.2,
    tTheta: 0.5,
    tPhi: 1.12,
    tRadius: 9.2,
    dragging: false,
    lastX: 0,
    lastY: 0,
    lastInteract: 0,
    pinchDist: 0,
  })

  useEffect(() => {
    const isMobile =
      matchMedia('(pointer:coarse)').matches || window.innerWidth < 760
    // mobile: lùi camera xa hơn -> cây nhỏ lại, thấy thêm cảnh phía sau
    const r = isMobile ? 12.5 : 9.2
    s.current.radius = r
    s.current.tRadius = r
  }, [])

  useEffect(() => {
    const el = gl.domElement
    const st = s.current
    const now = () => performance.now()

    const onDown = (e: PointerEvent) => {
      if (disabled) return
      st.dragging = true
      pointer.moved = 0
      pointer.dragging = true
      st.lastX = e.clientX
      st.lastY = e.clientY
      st.lastInteract = now()
    }
    const onMove = (e: PointerEvent) => {
      if (!st.dragging) return
      const dx = e.clientX - st.lastX
      const dy = e.clientY - st.lastY
      pointer.moved += Math.abs(dx) + Math.abs(dy)
      st.tTheta -= dx * 0.005
      st.tPhi = Math.max(0.55, Math.min(1.5, st.tPhi - dy * 0.005))
      st.lastX = e.clientX
      st.lastY = e.clientY
      st.lastInteract = now()
    }
    const onUp = () => {
      st.dragging = false
      pointer.dragging = false
    }
    const onWheel = (e: WheelEvent) => {
      if (disabled) return
      e.preventDefault()
      st.tRadius = Math.max(5, Math.min(15, st.tRadius + e.deltaY * 0.006))
      st.lastInteract = now()
    }
    const onTouchMove = (e: TouchEvent) => {
      if (disabled) return
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const d = Math.hypot(dx, dy)
        if (st.pinchDist)
          st.tRadius = Math.max(
            5,
            Math.min(15, st.tRadius + (st.pinchDist - d) * 0.02)
          )
        st.pinchDist = d
        st.lastInteract = now()
      }
    }
    const onTouchEnd = () => {
      st.pinchDist = 0
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd)
    // khi vào phòng giữa chừng: dừng kéo & reset cờ con trỏ
    if (disabled) {
      st.dragging = false
      pointer.dragging = false
      pointer.moved = 0
    }
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [gl, disabled])

  useFrame((state, dt) => {
    if (disabled) return
    const st = s.current
    const d = Math.min(dt, 0.05)
    // tự xoay nhẹ khi rảnh
    if (performance.now() - st.lastInteract > 2500) st.tTheta += d * 0.05
    st.theta += (st.tTheta - st.theta) * 0.08
    st.phi += (st.tPhi - st.phi) * 0.08
    st.radius += (st.tRadius - st.radius) * 0.08
    camera.position.set(
      st.target.x + st.radius * Math.sin(st.phi) * Math.sin(st.theta),
      st.target.y + st.radius * Math.cos(st.phi),
      st.target.z + st.radius * Math.sin(st.phi) * Math.cos(st.theta)
    )
    camera.lookAt(st.target)
  })

  return null
}
