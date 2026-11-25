'use client'
// Asset Poly Haven (CC0) cho cảnh ngoài + đá dùng chung 2 cảnh. Tất cả nạp NỀN trong <Suspense>:
// lúc chưa tải xong cảnh vẫn hiện bản procedural cũ (không chặn màn chờ).
import { useLayoutEffect, useMemo } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'

const GROUND = ['/scene/ground_diff.webp', '/scene/ground_nor.webp']
const BARK = ['/scene/bark_diff.webp', '/scene/bark_nor.webp']
const LEAVES = '/scene/leaves.webp'
/** Toàn bộ ảnh của cảnh cây (để SceneWarmup chờ trước khi mở màn chờ). */
export const SCENE_TEXTURES = [...GROUND, ...BARK, LEAVES]
export const ROCK_MODELS = ['/scene/rock_07.glb', '/scene/rock_09.glb'] as const

function prep(diff: THREE.Texture, nor: THREE.Texture, rx: number, ry: number) {
  for (const t of [diff, nor]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(rx, ry)
    t.anisotropy = 4
    t.needsUpdate = true
  }
  diff.colorSpace = THREE.SRGBColorSpace
}

/**
 * Gắn texture đất (leafy_grass) vào material mặt đất có sẵn.
 * Chống lộ ô lặp: trộn 2 lần lấy mẫu ở 2 tỉ lệ khác nhau (shader), vertex color vẫn tô vùng sáng/tối.
 */
export function GroundTexture({ material }: { material: THREE.MeshStandardMaterial }) {
  const [diff, nor] = useTexture(GROUND)
  useLayoutEffect(() => {
    prep(diff, nor, 130, 130)
    material.map = diff
    material.normalMap = nor
    material.normalScale.set(0.8, 0.8)
    material.color.set(0xdcf5b8) // kéo về xanh cỏ tươi hơn ảnh gốc (hơi nâu)
    material.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
          vec4 t1 = texture2D( map, vMapUv );
          vec4 t2 = texture2D( map, vMapUv * 0.27 + vec2( 0.37, 0.11 ) );
          diffuseColor *= mix( t1, t2, 0.5 );
        #endif`
      )
    }
    material.customProgramCacheKey = () => 'ground-ph-2scale'
    material.needsUpdate = true
  }, [diff, nor, material])
  return null
}

/** Vỏ cây thật (bark_brown_02, rêu + vết nứt) cho thân/cành cây ước. */
export function BarkTexture({ material }: { material: THREE.MeshStandardMaterial }) {
  const [diff, nor] = useTexture(BARK)
  useLayoutEffect(() => {
    prep(diff, nor, 1, 1)
    material.map = diff
    material.normalMap = nor
    material.normalScale.set(1.2, 1.2)
    material.color.set(0xdcc8b2)
    material.needsUpdate = true
  }, [diff, nor, material])
  return null
}

export type RockSpot = { x: number; y: number; z: number; s: number; yaw: number; tilt: number }

/**
 * Đá scan (rock_07, rock_09): mỗi model 1 instancedMesh. Model được chuẩn hoá: cỡ lớn nhất = 1, đáy ở y=0,
 * nên `s` = đường kính xấp xỉ (m). Vị trí chia luân phiên giữa các model.
 */
export function ScannedRocks({ spots, tint = 0xffffff }: { spots: RockSpot[]; tint?: number }) {
  const gltfs = useGLTF(ROCK_MODELS as unknown as string[])
  const models = useMemo(
    () =>
      gltfs.map((g) => {
        let mesh: THREE.Mesh | undefined
        g.scene.updateMatrixWorld(true)
        g.scene.traverse((o) => {
          if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh
        })
        const geo = mesh!.geometry.clone()
        geo.applyMatrix4(mesh!.matrixWorld)
        geo.computeBoundingBox()
        const bb = geo.boundingBox!
        const size = bb.getSize(new THREE.Vector3())
        const k = 1 / Math.max(size.x, size.y, size.z)
        geo.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2)
        geo.scale(k, k, k)
        const mat = (mesh!.material as THREE.MeshStandardMaterial).clone()
        mat.color.set(tint)
        return { geo, mat }
      }),
    [gltfs, tint]
  )
  useLayoutEffect(() => () => models.forEach((m) => m.geo.dispose()), [models])

  return (
    <>
      {models.map((m, mi) => {
        const mine = spots.filter((_, i) => i % models.length === mi)
        if (!mine.length) return null
        return (
          <instancedMesh
            key={mi}
            args={[m.geo, m.mat, mine.length]}
            castShadow
            receiveShadow
            ref={(mesh) => {
              if (!mesh) return
              const d = new THREE.Object3D()
              mine.forEach((p, i) => {
                d.position.set(p.x, p.y, p.z)
                d.rotation.set(p.tilt, p.yaw, p.tilt * 0.6)
                d.scale.setScalar(p.s)
                d.updateMatrix()
                mesh.setMatrixAt(i, d.matrix)
              })
              mesh.instanceMatrix.needsUpdate = true
            }}
          />
        )
      })}
    </>
  )
}
