'use client'
import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import { useScene } from '@/store/useScene'
import { ROCK_MODELS, SCENE_TEXTURES } from './SceneAssets'

// Chỉ báo "cảnh sẵn sàng" (tách màn chờ mực loang) khi:
//  1) mọi ảnh/model của cảnh cây đã TẢI (component này suspend tới lúc đó — cùng cache với nơi dùng),
//  2) mọi shader đã BIÊN DỊCH (compileAsync, không chặn luồng chính, dùng KHR_parallel_shader_compile),
//  3) đã VẼ thật 2 khung hình.
// Thiếu bước này, điện thoại mở màn chờ lúc canvas còn trống -> lộ nền trời CSS (xám hồng) ~1s.
// Bọc trong <Suspense fallback={null}>; Loader vẫn có MAX_WAIT phòng mạng chậm.
export default function SceneWarmup() {
  useTexture(SCENE_TEXTURES)
  useGLTF(ROCK_MODELS as unknown as string[])
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    let alive = true
    // đợi 1 khung để các component con kịp gắn texture vào material (useLayoutEffect) rồi mới compile
    requestAnimationFrame(() => {
      gl.compileAsync(scene, camera)
        .catch(() => {})
        .then(() => {
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              if (alive) useScene.getState().setSceneReady(true)
            })
          )
        })
    })
    return () => {
      alive = false
    }
  }, [gl, scene, camera])

  return null
}
