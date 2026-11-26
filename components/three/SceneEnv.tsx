'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PRESETS, type Condition } from '@/lib/weather'
import { useCondition } from '@/store/useScene'
import { windRef } from '@/lib/runtime'
import { skyUniforms, snapSky, stepSky } from '@/lib/skyPalette'
import SkyDome from './SkyDome'

// Mặt trời theo GIỜ THỰC: bình minh ~6h (đông), đỉnh ~12h (nam), hoàng hôn ~18h
// (tây), ban đêm xuống dưới chân trời. "Đêm" ép tối; chế độ ngày luôn đủ sáng.
function sunFromClock(date: Date, cond: Condition): { el: number; az: number; daylight: number } {
  const h = date.getHours() + date.getMinutes() / 60
  const inDay = h >= 6 && h <= 18
  let el: number
  let az: number
  if (inDay) {
    const dt = (h - 6) / 12
    el = 64 * Math.sin(Math.PI * dt)
    az = 90 + 180 * dt
  } else {
    el = -12
    az = 285
  }
  if (cond === 'night') {
    el = -12
    az = 285
  } else if (el < 14) {
    el = 14 // chế độ ngày (Nắng/Mây/Mưa) luôn đủ sáng kể cả sáng sớm/chiều muộn
    az = Math.min(Math.max(az, 110), 250)
  }
  // ban ngày không để tối dưới 0,6 (chiều muộn vẫn rõ cây cỏ); đêm giữ tối
  const daylight = THREE.MathUtils.clamp((el + 2) / 30, cond === 'night' ? 0.08 : 0.6, 1)
  return { el, az, daylight }
}

export default function SceneEnv() {
  const cond = useCondition()
  const preset = PRESETS[cond]
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const fogRef = useRef<THREE.Fog | null>(null)
  const sunRef = useRef<THREE.DirectionalLight>(null)

  // giờ hiện tại, cập nhật mỗi phút -> mặt trời dịch dần trong ngày
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const sun = useMemo(() => sunFromClock(now, cond), [now, cond])

  const sunPos = useMemo(() => {
    const el = THREE.MathUtils.degToRad(sun.el)
    const az = THREE.MathUtils.degToRad(sun.az)
    return new THREE.Vector3(
      Math.cos(el) * Math.sin(az),
      Math.sin(el),
      Math.cos(el) * Math.cos(az)
    )
  }, [sun])

  // fog lấy màu CHÂN TRỜI (skyUniforms.uHorizon, chuyển mượt) -> vật gần hoà vào trời, không lệch tông
  useEffect(() => {
    if (!fogRef.current) {
      snapSky(cond)
      fogRef.current = new THREE.Fog(skyUniforms.uHorizon.value.clone(), 45, 170)
      scene.fog = fogRef.current
    }
  }, [scene, cond])

  useEffect(() => {
    gl.toneMappingExposure = preset.sky.exposure
  }, [gl, preset.sky.exposure])

  useEffect(() => {
    const s = sunRef.current
    if (!s) return
    s.position.copy(sunPos).multiplyScalar(60)
    skyUniforms.uSunDir.value.copy(sunPos)
  }, [sunPos])

  useFrame((_, dt) => {
    windRef.current += (windRef.target - windRef.current) * 0.02
    stepSky(cond, Math.min(dt, 0.1))
    fogRef.current?.color.copy(skyUniforms.uHorizon.value)
  })

  return (
    <>
      <SkyDome />
      <hemisphereLight
        args={[preset.hemi.color, preset.hemi.ground, preset.hemi.intensity]}
      />
      <directionalLight
        ref={sunRef}
        intensity={preset.sun.intensity * sun.daylight}
        color={preset.sun.color}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.05}
        shadow-camera-near={1}
        shadow-camera-far={150}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
      <ambientLight intensity={preset.ambient} />
    </>
  )
}
