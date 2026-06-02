'use client'
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PRESETS } from '@/lib/weather'
import { useCondition } from '@/store/useScene'
import { windRef } from '@/lib/runtime'

// Ánh sáng + sương mù theo điều kiện thời tiết; đồng thời "lái" gió mỗi frame.
export default function SceneEnv() {
  const cond = useCondition()
  const preset = PRESETS[cond]
  const scene = useThree((s) => s.scene)
  const fogRef = useRef<THREE.Fog | null>(null)

  useEffect(() => {
    if (!fogRef.current) {
      fogRef.current = new THREE.Fog(preset.fog, 9, 22)
      scene.fog = fogRef.current
    }
    fogRef.current.color.setHex(preset.fog)
  }, [scene, preset.fog])

  // gió tiến dần tới windTarget (mưa/gió mạnh -> lắc nhiều hơn)
  useFrame(() => {
    windRef.current += (windRef.target - windRef.current) * 0.02
  })

  return (
    <>
      <hemisphereLight
        args={[preset.hemi.color, preset.hemi.ground, preset.hemi.intensity]}
      />
      <directionalLight
        position={[5, 9, 4]}
        intensity={preset.sun.intensity}
        color={preset.sun.color}
      />
      <ambientLight intensity={preset.ambient} />
    </>
  )
}
