'use client'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useScene } from '@/store/useScene'
import type { Session } from '@/lib/presence'

const TAU = Math.PI * 2
const CAP = 24 // tối đa số avatar vẽ (dư hiển thị "+N")
const RING_R = 3.5

// ---- hình nhân ngồi thiền low-poly: áo (nón) + đầu (cầu), màu baked vào vertex ----
function makeMeditator(): THREE.BufferGeometry {
  const pos: number[] = []
  const col: number[] = []
  const c = new THREE.Color()
  const add = (geom: THREE.BufferGeometry, hex: number) => {
    const ng = geom.toNonIndexed()
    const p = ng.attributes.position as THREE.BufferAttribute
    c.set(hex)
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i))
      col.push(c.r, c.g, c.b)
    }
    ng.dispose()
    geom.dispose()
  }
  const robe = new THREE.ConeGeometry(0.46, 0.95, 8)
  robe.translate(0, 0.47, 0)
  add(robe, 0x7c8aa6)
  const head = new THREE.SphereGeometry(0.19, 10, 8)
  head.translate(0, 1.05, 0)
  add(head, 0xe6c9a8)
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  out.computeVertexNormals()
  return out
}

function glowTexture(): THREE.CanvasTexture {
  const S = 128
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  grd.addColorStop(0, 'rgba(255,236,190,0.7)')
  grd.addColorStop(0.5, 'rgba(255,214,150,0.22)')
  grd.addColorStop(1, 'rgba(255,214,150,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, S, S)
  return new THREE.CanvasTexture(c)
}

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`
}

function positionFor(i: number, n: number): [number, number, number] {
  const a = (i / Math.max(1, n)) * TAU
  return [Math.cos(a) * RING_R, 0, Math.sin(a) * RING_R]
}

// Nhãn tên + đồng hồ phiên = sprite texture canvas, vẽ lại 1 lần/giây (nhẹ mobile).
function Label({ session, self }: { session: Session; self: boolean }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 128
    const t = new THREE.CanvasTexture(c)
    t.minFilter = THREE.LinearFilter
    return t
  }, [])
  const lastSec = useRef(-1)

  const draw = (elapsed: number) => {
    const c = tex.image as HTMLCanvasElement
    const g = c.getContext('2d')!
    g.clearRect(0, 0, 256, 128)
    // tên
    g.font = '600 30px "Be Vietnam Pro", sans-serif'
    g.textAlign = 'center'
    g.fillStyle = self ? '#ffe6a8' : '#f2efe8'
    g.fillText(session.name.slice(0, 18), 128, 40)
    // đồng hồ phiên
    g.font = '700 44px "Be Vietnam Pro", monospace'
    g.fillStyle = '#ffffff'
    g.fillText(fmt(elapsed), 128, 92)
    tex.needsUpdate = true
  }

  useFrame(() => {
    const elapsed = Date.now() - (session.joinedAt || Date.now())
    const sec = Math.floor(elapsed / 1000)
    if (sec !== lastSec.current) {
      lastSec.current = sec
      draw(elapsed)
    }
  })

  return (
    <sprite scale={[1.7, 0.85, 1]} renderOrder={2}>
      <spriteMaterial map={tex} transparent depthWrite={false} depthTest={false} />
    </sprite>
  )
}

export default function Meditators({ active }: { active: boolean }) {
  const sessions = useScene((s) => s.sessions)
  const figRef = useRef<THREE.InstancedMesh>(null)

  const geo = useMemo(() => makeMeditator(), [])
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }),
    []
  )
  const glowTex = useMemo(() => glowTexture(), [])

  const shown = sessions.slice(0, CAP)
  const n = shown.length

  const glowPos = useMemo(() => {
    const arr = new Float32Array(CAP * 3)
    for (let i = 0; i < CAP; i++) {
      const [x, , z] = positionFor(i, Math.max(1, n))
      arr[i * 3] = x
      arr[i * 3 + 1] = 0.2
      arr[i * 3 + 2] = z
    }
    return arr
  }, [n])

  useLayoutEffect(() => {
    const fig = figRef.current
    if (!fig) return
    const dummy = new THREE.Object3D()
    const col = new THREE.Color()
    for (let i = 0; i < CAP; i++) {
      if (i < n) {
        const [x, y, z] = positionFor(i, n)
        dummy.position.set(x, y, z)
        // hơi nhấp nhô để bớt cứng
        dummy.rotation.set(0, Math.atan2(-x, -z), 0)
        dummy.scale.setScalar(1)
        col.set(shown[i].isSelf ? 0xffd9a0 : 0xffffff)
      } else {
        dummy.position.set(0, -999, 0) // ẩn instance thừa
        dummy.scale.setScalar(0.0001)
        col.set(0xffffff)
      }
      dummy.updateMatrix()
      fig.setMatrixAt(i, dummy.matrix)
      fig.setColorAt(i, col)
    }
    fig.instanceMatrix.needsUpdate = true
    if (fig.instanceColor) fig.instanceColor.needsUpdate = true
  }, [n, shown])

  if (!active) return null

  return (
    <group>
      <instancedMesh ref={figRef} args={[geo, mat, CAP]} castShadow />
      {/* hào quang dưới mỗi người */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[glowPos, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={glowTex}
          size={1.6}
          sizeAttenuation
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      {/* nhãn tên + đồng hồ phiên trên đầu */}
      {shown.map((s, i) => {
        const [x, , z] = positionFor(i, n)
        return (
          <group key={s.clientId} position={[x, 1.7, z]}>
            <Label session={s} self={!!s.isSelf} />
          </group>
        )
      })}
    </group>
  )
}
