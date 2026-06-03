'use client'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import Tree from './three/Tree'
import Ground from './three/Ground'
import Scenery from './three/Scenery'
import Clouds from './three/Clouds'
import Meadow from './three/Meadow'
import Foliage from './three/Foliage'
import Dew from './three/Dew'
import Critters from './three/Critters'
import CalligraphyDesk from './three/CalligraphyDesk'
import DecorPapers from './three/DecorPapers'
import WishPapers from './three/WishPapers'
import Rain from './three/Rain'
import StonePath from './three/StonePath'
import CameraRig from './three/CameraRig'
import SceneEnv from './three/SceneEnv'
import FocusRoom from './three/FocusRoom'
import { useScene } from '@/store/useScene'

export default function WishTreeCanvas() {
  const roomOpen = useScene((s) => s.roomOpen)
  const isMobile =
    typeof window !== 'undefined' &&
    (matchMedia('(pointer:coarse)').matches || window.innerWidth < 760)

  return (
    <Canvas
      style={{ position: 'fixed', inset: 0, zIndex: 1, touchAction: 'none' }}
      dpr={[1, isMobile ? 1.5 : 2]}
      shadows
      gl={{
        antialias: !isMobile,
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
      }}
      camera={{ fov: 46, near: 0.1, far: 320, position: [0, 2.6, 9.2] }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.shadowMap.type = THREE.PCFSoftShadowMap
      }}
    >
      <AdaptiveDpr pixelated={false} />
      <SceneEnv />
      {/* ở phòng Rừng Trúc thì RoomCamera tiếp quản -> tắt orbit rig chính */}
      <CameraRig disabled={roomOpen} />

      {/* Cảnh cây ước nguyện — ẩn khi vào phòng (KHÔNG unmount để vào lại tức thì) */}
      <group visible={!roomOpen}>
        <Scenery />
        <Clouds />
        <Ground />
        <StonePath />
        <Meadow />
        <Tree />
        <Foliage />
        {/* bóng tán cây mềm in xuống đất */}
        <ContactShadows
          position={[0, 0.02, 0]}
          scale={18}
          far={7}
          blur={2.6}
          opacity={0.5}
          resolution={1024}
          color="#2a2012"
        />
        <DecorPapers />
        <WishPapers />
        <CalligraphyDesk />
        <Rain />
        <Dew />
        <Critters />
      </group>

      {/* Phòng Rừng Trúc (tự gate: rỗng khi chưa mở) */}
      <FocusRoom active={roomOpen} />
    </Canvas>
  )
}
