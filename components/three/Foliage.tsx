'use client'
import { Suspense, useLayoutEffect, useMemo, useRef } from 'react'
import { useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TIPS, mulberry32 } from '@/lib/tree'
import { windRef } from '@/lib/runtime'
import { makeLeafCluster } from '@/lib/textures'
import { makeBranch, mergeBranches } from '@/lib/branch'
import { useIsMobile } from './useIsMobile'

// Tán lá: RẤT NHIỀU card "cành lá" (ảnh lá thật Poly Haven ghép thành chùm trên cành nhỏ, atlas 2 biến thể
// public/scene/leaves.webp). Card mọc TỎA RA từ đầu cành (gốc card ở trong, ngọn hướng ra ngoài + hơi lên).
// Ánh sáng: pháp tuyến pha với hướng "từ tâm tán ra" (mẹo dựng tán cây) -> tán sáng mềm như một khối,
// mặt trên sáng, lõi/dưới tối, KHÔNG card nào đen kịt khi quay lưng. Lúc chưa tải ảnh: card canvas cũ.
const TINTS = [0xffffff, 0xeef6dc, 0xdcebc4, 0xf6f8e6, 0xcfe2b0]

// tâm tán (trung bình các đầu cành, hạ thấp chút) cho pháp tuyến hình cầu
const CROWN = TIPS.reduce((a, t) => a.add(new THREE.Vector3(...t)), new THREE.Vector3())
  .divideScalar(TIPS.length)
  .add(new THREE.Vector3(0, -0.6, 0))

/** Gắn shader tán lá: chọn nửa atlas theo aVar (khi có atlas), pháp tuyến hình cầu, không lật mặt sau. */
function foliageShader(mat: THREE.MeshStandardMaterial, atlas: boolean) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uCenter = { value: CROWN }
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uCenter;
        attribute float aVar;`
      )
      .replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
        ${atlas ? 'vMapUv.x = vMapUv.x * 0.5 + aVar * 0.5;' : ''}`
      )
      .replace(
        '#include <defaultnormal_vertex>',
        `#include <defaultnormal_vertex>
        {
          vec3 op = (instanceMatrix * vec4(position, 1.0)).xyz;
          vec3 sph = normalize(op - uCenter);
          transformedNormal = normalize(mix(transformedNormal, normalMatrix * sph, 0.75));
        }`
      )
    // DoubleSide: three lật pháp tuyến cho mặt sau -> với pháp tuyến hình cầu thì KHÔNG lật
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <normal_fragment_begin>',
      `float faceDirection = 1.0;
      vec3 normal = normalize( vNormal );
      vec3 nonPerturbedNormal = normal;`
    )
  }
  mat.customProgramCacheKey = () => (atlas ? 'foliage-atlas' : 'foliage-canvas')
}

export default function Foliage() {
  const isMobile = useIsMobile()
  const perTip = isMobile ? 40 : 70
  const N = TIPS.length * perTip
  const ref = useRef<THREE.InstancedMesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const tex = useMemo(() => makeLeafCluster(), [])
  // card có GỐC ở mép dưới (gốc cành) -> xoay quanh gốc cho cành toả ra từ đầu cành
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.72, 0.72)
    g.translate(0, 0.36, 0)
    return g
  }, [])
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      map: tex,
      alphaTest: 0.42,
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0,
    })
    foliageShader(m, false)
    return m
  }, [tex])

  // Cành nhỏ NÂU đỡ lá: mỗi đầu cành (TIP) mọc vài HỆ CÀNH PHÂN NHÁNH cong, gnarled
  // (lib/branch) vươn ra/rủ vào trong chùm lá -> dáng cành khô thật, không "que đũa".
  // Gộp hết thành MỘT geometry (1 draw call).
  const sysPerTip = isMobile ? 2 : 3
  const twigMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x5b432a, roughness: 0.92, metalness: 0 }),
    []
  )
  const twigGeo = useMemo(() => {
    const rng = mulberry32(0x7416c0) // seed cố định -> cành KHÔNG đổi giữa các lần load
    const up = new THREE.Vector3(0, 1, 0)
    const dir = new THREE.Vector3()
    const q = new THREE.Quaternion()
    const m = new THREE.Matrix4()
    const one = new THREE.Vector3(1, 1, 1)
    const branches: { geo: THREE.BufferGeometry; matrix: THREE.Matrix4 }[] = []
    for (const t of TIPS) {
      for (let j = 0; j < sysPerTip; j++) {
        const th = rng() * Math.PI * 2
        const el = -0.55 + rng() * 0.7 // hướng mọc: chếch xuống -> ngang (cành rủ)
        dir.set(
          Math.cos(el) * Math.cos(th),
          Math.sin(el),
          Math.cos(el) * Math.sin(th)
        ).normalize()
        const geo = makeBranch({
          length: 0.7 + rng() * 0.5,
          base: 0.03 + rng() * 0.012,
          depth: 2,
          rng,
        })
        q.setFromUnitVectors(up, dir)
        m.compose(new THREE.Vector3(t[0], t[1] + 0.1, t[2]), q, one)
        branches.push({ geo, matrix: m.clone() })
      }
    }
    return mergeBranches(branches)
  }, [sysPerTip])

  const leaves = useMemo(() => {
    const rng = mulberry32(0x1eaf01) // seed cố định -> tán lá KHÔNG đổi giữa các lần load
    const arr: { m: THREE.Matrix4; color: number; v: number }[] = []
    const dummy = new THREE.Object3D()
    const out = new THREE.Vector3()
    const roll = new THREE.Quaternion()
    const UP = new THREE.Vector3(0, 1, 0)
    for (const t of TIPS) {
      for (let j = 0; j < perTip; j++) {
        const u = rng()
        const rad = 0.4 + Math.pow(u, 0.6) * 1.5
        const th = rng() * Math.PI * 2
        const ph = Math.acos(2 * rng() - 1)
        dummy.position.set(
          t[0] + rad * Math.sin(ph) * Math.cos(th),
          t[1] + rad * Math.cos(ph) * 0.9 + 0.2,
          t[2] + rad * Math.sin(ph) * Math.sin(th)
        )
        // trục cành (local +Y) = hướng từ tâm tán ra + hơi ngóc lên + lệch ngẫu nhiên; quay quanh trục đó ngẫu nhiên
        out.copy(dummy.position).sub(CROWN).normalize()
        out.y += 0.35
        out.x += (rng() - 0.5) * 0.9
        out.z += (rng() - 0.5) * 0.9
        out.y += (rng() - 0.5) * 0.6
        out.normalize()
        dummy.quaternion.setFromUnitVectors(UP, out)
        dummy.quaternion.multiply(roll.setFromAxisAngle(UP, rng() * Math.PI * 2))
        // lùi gốc card vào trong để chùm lá phủ kín đầu cành
        dummy.position.addScaledVector(out, -0.25)
        const s = 0.7 + rng() * 0.6
        dummy.scale.set(s, s, s)
        dummy.updateMatrix()
        arr.push({
          m: dummy.matrix.clone(),
          color: TINTS[(rng() * TINTS.length) | 0],
          v: rng() < 0.5 ? 0 : 1, // nửa atlas nào
        })
      }
    }
    return arr
  }, [perTip])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const col = new THREE.Color()
    leaves.forEach((l, i) => {
      mesh.setMatrixAt(i, l.m)
      mesh.setColorAt(i, col.set(l.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [leaves])

  // biến thể atlas mỗi card (attribute instanced) — gắn ngay khi tạo geometry
  const cardGeo = useMemo(() => {
    const g = geo.clone()
    g.setAttribute('aVar', new THREE.InstancedBufferAttribute(new Float32Array(leaves.map((l) => l.v)), 1))
    return g
  }, [geo, leaves])

  // cả tán đung đưa nhẹ theo gió (rẻ: chỉ xoay group)
  useFrame((state) => {
    const grp = groupRef.current
    if (!grp) return
    const t = state.clock.elapsedTime
    const w = windRef.current
    grp.rotation.z = Math.sin(t * 0.9) * 0.016 * w
    grp.rotation.x = Math.cos(t * 0.7) * 0.011 * w
  })

  return (
    <group ref={groupRef}>
      <mesh geometry={twigGeo} material={twigMat} castShadow />
      <instancedMesh ref={ref} args={[cardGeo, mat, N]} receiveShadow />
      <Suspense fallback={null}>
        <LeafAtlas material={mat} />
      </Suspense>
    </group>
  )
}

/** Khi ảnh lá thật tải xong: đổi map + shader sang atlas 2 biến thể. */
function LeafAtlas({ material }: { material: THREE.MeshStandardMaterial }) {
  const tex = useTexture('/scene/leaves.webp')
  useLayoutEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    material.map = tex
    material.alphaTest = 0.5
    material.color.set(0xecf8d6) // ảnh lá hơi ngả vàng -> kéo về xanh
    foliageShader(material, true)
    material.needsUpdate = true
  }, [tex, material])
  return null
}
