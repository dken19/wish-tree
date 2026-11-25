'use client'
import { useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { player } from '@/lib/runtime'
import { resolveMove, SHRINE_POS, SHRINE_STAND, steer } from '@/lib/roomMap'
import { useScene } from '@/store/useScene'

const SPEED = 2.6 // m/s
const fwd = new THREE.Vector3()
let stuck = 0

function angleLerp(a: number, b: number, t: number) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI
  if (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}

// Điều khiển nhân vật của mình: WASD/mũi tên (theo hướng camera) hoặc chạm đất để đi tới (RoomCamera gọi walkTo).
// Va chạm tròn với trúc/tượng/ao/người ngồi (lib/roomMap). Đứng yên tại ghế -> tự ngồi thiền.
export default function PlayerController({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return
    const map: Record<string, keyof typeof player.keys> = {
      KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r',
    }
    const typing = () => {
      const el = document.activeElement
      return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
    }
    const down = (e: KeyboardEvent) => {
      const k = map[e.code]
      if (!k || typing()) return
      player.keys[k] = 1
      e.preventDefault()
    }
    const up = (e: KeyboardEvent) => {
      const k = map[e.code]
      if (k) player.keys[k] = 0
    }
    const blur = () => (player.keys = { f: 0, b: 0, l: 0, r: 0 })
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      blur()
      player.ready = false // vào lại phòng: về ghế
      player.hasTarget = false
      player.goal = null
    }
  }, [active])

  useFrame((state, dtRaw) => {
    if (!active || !player.ready) return
    const dt = Math.min(dtRaw, 0.1)
    const sc = useScene.getState()
    const k = player.keys
    let mx = 0
    let mz = 0

    const kf = k.f - k.b
    const kr = k.r - k.l
    if ((kf || kr) && !sc.shrineOpen) {
      // hướng camera chiếu xuống mặt đất
      state.camera.getWorldDirection(fwd)
      fwd.y = 0
      fwd.normalize()
      mx = fwd.x * kf - fwd.z * kr
      mz = fwd.z * kf + fwd.x * kr
      player.hasTarget = false
      player.goal = null
    } else if (player.hasTarget) {
      if (player.goal === 'shrine') {
        player.tx = SHRINE_STAND.x
        player.tz = SHRINE_STAND.z
      } else if (player.goal === 'seat') {
        player.tx = player.seatX
        player.tz = player.seatZ
      }
      const dx = player.tx - player.x
      const dz = player.tz - player.z
      const d = Math.hypot(dx, dz)
      if (d < 0.12) {
        player.hasTarget = false
        if (player.goal === 'shrine') {
          player.yaw = Math.atan2(SHRINE_POS.x - player.x, SHRINE_POS.z - player.z)
          sc.setShrineOpen(true)
        }
        player.goal = null
      } else {
        const sp = Math.min(1, d / 0.6) // chậm lại khi gần tới
        // gần đích thì đi thẳng (đích có thể sát vật cản), xa thì lách
        const [ux, uz] = d > 0.8 ? steer(player.x, player.z, dx / d, dz / d, player.others) : [dx / d, dz / d]
        mx = ux * sp
        mz = uz * sp
      }
    }

    const len = Math.hypot(mx, mz)
    if (len > 0.01) {
      const nx = player.x + (mx / Math.max(1, len)) * SPEED * dt
      const nz = player.z + (mz / Math.max(1, len)) * SPEED * dt
      const [rx, rz] = resolveMove(nx, nz, player.others)
      const moved = Math.hypot(rx - player.x, rz - player.z)
      player.x = rx
      player.z = rz
      player.moving = moved > SPEED * dt * 0.15
      // kẹt hơn 1 giây (đâm vào vật cản khi đi tới đích) -> bỏ đích
      stuck = player.moving ? 0 : stuck + dt
      if (stuck > 1 && player.hasTarget) {
        player.hasTarget = false
        player.goal = null
        stuck = 0
      }
      if (player.moving) player.yaw = angleLerp(player.yaw, Math.atan2(mx, mz), 0.2)
    } else {
      player.moving = false
    }

    // ngồi xuống khi đứng yên ngay tại ghế
    player.idle = player.moving ? 0 : player.idle + dt
    const atSeat = Math.hypot(player.x - player.seatX, player.z - player.seatZ) < 0.35
    const wantSit = atSeat && player.idle > 0.5 && !sc.shrineOpen ? 1 : 0
    if (wantSit && player.sit < 1) {
      // trượt vào giữa ghế + quay mặt vào tâm sân
      player.x += (player.seatX - player.x) * 0.2
      player.z += (player.seatZ - player.z) * 0.2
      player.yaw = angleLerp(player.yaw, Math.atan2(-player.seatX, -player.seatZ), 0.15)
    }
    player.sit += (wantSit - player.sit) * Math.min(1, dt * 6)

    const near = Math.hypot(player.x - SHRINE_STAND.x, player.z - SHRINE_STAND.z) < 1.8
    if (near !== sc.nearShrine) sc.setNearShrine(near)
  })

  return null
}
