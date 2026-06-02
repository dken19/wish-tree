'use client'
import { useMemo } from 'react'
import * as THREE from 'three'
import { useIsMobile } from './useIsMobile'

// Phông nền thung lũng yên bình bao quanh cây: sàn thung lũng + đồi gần,
// núi xa (kiểu khí quyển, mờ vào trời), rừng thông và một xóm nhà nhỏ.
// Tất cả low-poly, tĩnh -> rất nhẹ.

const TAU = Math.PI * 2

export default function Scenery() {
  const isMobile = useIsMobile()

  // ----- Đồi gần (mounds tròn, xanh) thành vòng quanh -----
  const hills = useMemo(() => {
    const out: { pos: [number, number, number]; scale: [number, number, number]; color: number }[] = []
    const greens = [0x9ec089, 0x8fb57e, 0xa7c894, 0x82a972]
    const n = 14
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + (Math.random() - 0.5) * 0.25
      const r = 11 + Math.random() * 4
      const h = 1.6 + Math.random() * 2.2
      const w = 3 + Math.random() * 2.5
      out.push({
        pos: [Math.cos(a) * r, h * 0.35 - 1.2, Math.sin(a) * r],
        scale: [w, h, w],
        color: greens[(Math.random() * greens.length) | 0],
      })
    }
    return out
  }, [])

  // ----- Núi xa (cone, hơi xanh xám, có chỏm tuyết) -----
  const mountains = useMemo(() => {
    const out: {
      pos: [number, number, number]
      baseR: number
      height: number
      color: number
      snow: boolean
    }[] = []
    const blues = [0x8aa6b8, 0x9fb6c4, 0x7e9bad, 0xa9c0cc]
    const n = 11
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + (Math.random() - 0.5) * 0.3
      const r = 19 + Math.random() * 6
      const height = 7 + Math.random() * 5
      const baseR = 3.5 + Math.random() * 2.5
      out.push({
        pos: [Math.cos(a) * r, height / 2 - 1.8, Math.sin(a) * r],
        baseR,
        height,
        color: blues[(Math.random() * blues.length) | 0],
        snow: height > 9,
      })
    }
    return out
  }, [])

  // ----- Rừng thông rải rác (instanced cone) -----
  const pineCount = isMobile ? 36 : 64
  const pineData = useMemo(() => {
    const arr: { p: THREE.Vector3; s: number }[] = []
    for (let i = 0; i < pineCount; i++) {
      const a = Math.random() * TAU
      const r = 8.5 + Math.random() * 8
      arr.push({
        p: new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r),
        s: 0.7 + Math.random() * 0.8,
      })
    }
    return arr
  }, [pineCount])

  return (
    <group>
      {/* Sàn thung lũng lớn lấp chân trời */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.05}>
        <circleGeometry args={[42, 48]} />
        <meshLambertMaterial color={0xa9c697} />
      </mesh>

      {/* Đồi gần */}
      {hills.map((h, i) => (
        <mesh key={`hill-${i}`} position={h.pos} scale={h.scale}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshLambertMaterial color={h.color} flatShading />
        </mesh>
      ))}

      {/* Núi xa */}
      {mountains.map((m, i) => (
        <group key={`mtn-${i}`} position={m.pos}>
          <mesh>
            <coneGeometry args={[m.baseR, m.height, 6, 1]} />
            <meshLambertMaterial color={m.color} flatShading />
          </mesh>
          {m.snow && (
            <mesh position-y={m.height * 0.32}>
              <coneGeometry args={[m.baseR * 0.42, m.height * 0.34, 6, 1]} />
              <meshLambertMaterial color={0xeef4f7} flatShading />
            </mesh>
          )}
        </group>
      ))}

      {/* Rừng thông (foliage instanced) */}
      <Pines data={pineData} />

      {/* Xóm nhà nhỏ bên một sườn đồi */}
      <Village />
    </group>
  )
}

function Pines({ data }: { data: { p: THREE.Vector3; s: number }[] }) {
  const N = data.length
  const ref = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return
    const dummy = new THREE.Object3D()
    data.forEach((d, i) => {
      dummy.position.set(d.p.x, d.s * 0.9 - 0.2, d.p.z)
      dummy.scale.set(d.s, d.s * 1.3, d.s)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]}>
      <coneGeometry args={[0.55, 1.8, 6, 1]} />
      <meshLambertMaterial color={0x5f8f6a} flatShading />
    </instancedMesh>
  )
}

function House({
  position,
  rotation = 0,
  roof = 0xc2683f,
  wall = 0xeadcc6,
}: {
  position: [number, number, number]
  rotation?: number
  roof?: number
  wall?: number
}) {
  return (
    <group position={position} rotation-y={rotation}>
      <mesh position-y={0.4}>
        <boxGeometry args={[1, 0.8, 0.9]} />
        <meshLambertMaterial color={wall} flatShading />
      </mesh>
      <mesh position-y={1.0} rotation-y={Math.PI / 4}>
        <coneGeometry args={[0.85, 0.6, 4]} />
        <meshLambertMaterial color={roof} flatShading />
      </mesh>
    </group>
  )
}

function Village() {
  // cụm vài nhà bên một phía (azimuth ~ -0.7rad), nép vào đồi
  const base = useMemo(() => {
    const cx = Math.cos(-0.7) * 10
    const cz = Math.sin(-0.7) * 10
    return { cx, cz }
  }, [])
  return (
    <group>
      <House position={[base.cx, -0.4, base.cz]} rotation={0.3} />
      <House position={[base.cx + 1.6, -0.4, base.cz - 1.1]} rotation={-0.4} roof={0xa8502f} />
      <House position={[base.cx - 1.4, -0.4, base.cz + 1.2]} rotation={0.6} roof={0xcf7a45} wall={0xf0e6d2} />
      <House position={[base.cx + 0.4, -0.4, base.cz + 2.1]} rotation={-0.2} />
    </group>
  )
}
