'use client'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TIPS } from '@/lib/tree'
import { windRef } from '@/lib/runtime'
import { useIsMobile } from './useIsMobile'

const REDS = [0xd6243a, 0xe1364a, 0xc01730, 0xe8556a]
const STRING_LEN = 0.12
const PW = 0.16
const PH = 0.22

// Giấy đỏ trang trí đung đưa theo gió (InstancedMesh, KHÔNG click được).
export default function DecorPapers() {
  const isMobile = useIsMobile()
  const N = isMobile ? 55 : 130
  const paperRef = useRef<THREE.InstancedMesh>(null)
  const stringRef = useRef<THREE.InstancedMesh>(null)

  const paperGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(PW, PH)
    g.translate(0, -(STRING_LEN + PH / 2), 0)
    return g
  }, [])
  const stringGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.01, STRING_LEN)
    g.translate(0, -STRING_LEN / 2, 0)
    return g
  }, [])

  const data = useMemo(() => {
    const arr: {
      tip: THREE.Vector3
      yaw: number
      phase: number
      speed: number
      amp: number
      color: number
    }[] = []
    for (let i = 0; i < N; i++) {
      const t = TIPS[i % TIPS.length]
      const tip = new THREE.Vector3(
        t[0] + (Math.random() - 0.5) * 1.1,
        t[1] + (Math.random() - 0.2) * 0.7 - 0.1,
        t[2] + (Math.random() - 0.5) * 1.1
      )
      arr.push({
        tip,
        yaw: Math.random() * Math.PI * 2,
        phase: Math.random() * Math.PI * 2,
        speed: 0.7 + Math.random() * 0.6,
        amp: 0.12 + Math.random() * 0.12,
        color: REDS[(Math.random() * REDS.length) | 0],
      })
    }
    return arr
  }, [N])

  useLayoutEffect(() => {
    const paper = paperRef.current
    if (!paper) return
    const col = new THREE.Color()
    data.forEach((d, i) => paper.setColorAt(i, col.setHex(d.color)))
    if (paper.instanceColor) paper.instanceColor.needsUpdate = true
  }, [data])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    const wind = windRef.current
    const paper = paperRef.current
    const string = stringRef.current
    if (!paper || !string) return
    for (let i = 0; i < data.length; i++) {
      const d = data[i]
      const sw = d.amp * wind * Math.sin(t * d.speed + d.phase)
      dummy.position.copy(d.tip)
      dummy.rotation.set(sw * 0.7, d.yaw, sw)
      dummy.updateMatrix()
      paper.setMatrixAt(i, dummy.matrix)
      string.setMatrixAt(i, dummy.matrix)
    }
    paper.instanceMatrix.needsUpdate = true
    string.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <instancedMesh ref={stringRef} args={[stringGeo, undefined, N]}>
        <meshBasicMaterial color={0x7a4a2a} side={THREE.DoubleSide} />
      </instancedMesh>
      <instancedMesh ref={paperRef} args={[paperGeo, undefined, N]}>
        <meshLambertMaterial color={0xd6243a} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  )
}
