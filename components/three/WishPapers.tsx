'use client'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { anchorFor } from '@/lib/tree'
import { windRef, pointer } from '@/lib/runtime'
import { useScene } from '@/store/useScene'
import { THEMES } from '@/lib/themes'
import type { Wish } from '@/lib/wishes'

const STRING_LEN = 0.14
const PW = 0.2
const PH = 0.28

function makeGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, 'rgba(255,236,170,.95)')
  grd.addColorStop(0.4, 'rgba(255,205,120,.45)')
  grd.addColorStop(1, 'rgba(255,205,120,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

// Điều ước ĐÃ DUYỆT — click được để đọc. Một InstancedMesh cho mọi tờ.
export default function WishPapers() {
  const wishes = useScene((s) => s.wishes)
  const setOpenWish = useScene((s) => s.setOpenWish)

  const paperRef = useRef<THREE.InstancedMesh>(null)
  const stringRef = useRef<THREE.InstancedMesh>(null)
  const count = wishes.length

  const paperGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(PW, PH)
    g.translate(0, -(STRING_LEN + PH / 2), 0)
    return g
  }, [])
  const stringGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.012, STRING_LEN)
    g.translate(0, -STRING_LEN / 2, 0)
    return g
  }, [])

  // Vị trí + nhịp lắc tất định cho từng điều ước
  const data = useMemo(
    () =>
      wishes.map((w) => {
        const anchor = anchorFor(w.id, w.theme)
        const seed = (anchor[0] * 53 + anchor[2] * 17) % (Math.PI * 2)
        return {
          anchor: new THREE.Vector3(...anchor),
          yaw: seed,
          phase: Math.abs(seed) * 3,
          swing: 0.8 + (Math.abs(seed) % 0.4),
          color: THEMES[w.theme]?.color ?? '#d6243a',
        }
      }),
    [wishes]
  )

  const glowTex = useMemo(() => makeGlowTexture(), [])
  const featured = useMemo(() => data.slice(0, Math.min(6, data.length)), [data])

  useLayoutEffect(() => {
    const paper = paperRef.current
    if (!paper || count === 0) return
    const col = new THREE.Color()
    data.forEach((d, i) => paper.setColorAt(i, col.set(d.color)))
    if (paper.instanceColor) paper.instanceColor.needsUpdate = true
  }, [data, count])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    const wind = windRef.current
    const paper = paperRef.current
    const string = stringRef.current
    if (!paper || !string) return
    for (let i = 0; i < data.length; i++) {
      const d = data[i]
      const sw = 0.14 * wind * Math.sin(t * d.swing + d.phase)
      dummy.position.copy(d.anchor)
      dummy.rotation.set(sw * 0.6, d.yaw, sw)
      dummy.updateMatrix()
      paper.setMatrixAt(i, dummy.matrix)
      string.setMatrixAt(i, dummy.matrix)
    }
    paper.instanceMatrix.needsUpdate = true
    string.instanceMatrix.needsUpdate = true
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (pointer.moved > 7) return // đang xoay cây, bỏ qua
    if (e.instanceId == null) return
    e.stopPropagation()
    const w: Wish | undefined = wishes[e.instanceId]
    if (w) setOpenWish(w)
  }

  if (count === 0) return null

  return (
    <group>
      <instancedMesh ref={stringRef} args={[stringGeo, undefined, count]}>
        <meshBasicMaterial color={0x7a4a2a} side={THREE.DoubleSide} />
      </instancedMesh>
      <instancedMesh
        ref={paperRef}
        args={[paperGeo, undefined, count]}
        onClick={handleClick}
      >
        <meshLambertMaterial
          color={0xffffff}
          side={THREE.DoubleSide}
          emissive={0x7a0d1a}
          emissiveIntensity={0.35}
        />
      </instancedMesh>
      <FeaturedGlow tex={glowTex} items={featured} />
    </group>
  )
}

// Hào quang lấp lánh cho vài tờ "nổi bật" để mời người dùng click.
function FeaturedGlow({
  tex,
  items,
}: {
  tex: THREE.Texture
  items: { anchor: THREE.Vector3 }[]
}) {
  const group = useRef<THREE.Group>(null)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    const g = group.current
    if (!g) return
    g.children.forEach((child, i) => {
      const sp = child as THREE.Sprite
      const k = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.7))
      ;(sp.material as THREE.SpriteMaterial).opacity = k
      const s = 0.8 + 0.25 * k
      sp.scale.set(s, s, 1)
    })
  })
  return (
    <group ref={group}>
      {items.map((it, i) => (
        <sprite
          key={i}
          position={[it.anchor.x, it.anchor.y - 0.26, it.anchor.z]}
          scale={[0.95, 0.95, 1]}
        >
          <spriteMaterial
            map={tex}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </group>
  )
}
