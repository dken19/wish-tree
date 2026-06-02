'use client'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr } from '@react-three/drei'
import * as THREE from 'three'
import Tree from './three/Tree'
import Ground from './three/Ground'
import Scenery from './three/Scenery'
import Meadow from './three/Meadow'
import Dew from './three/Dew'
import Critters from './three/Critters'
import CalligraphyDesk from './three/CalligraphyDesk'
import Blossoms from './three/Blossoms'
import DecorPapers from './three/DecorPapers'
import WishPapers from './three/WishPapers'
import Petals from './three/Petals'
import Rain from './three/Rain'
import CameraRig from './three/CameraRig'
import SceneEnv from './three/SceneEnv'

export default function WishTreeCanvas() {
  const isMobile =
    typeof window !== 'undefined' &&
    (matchMedia('(pointer:coarse)').matches || window.innerWidth < 760)

  return (
    <Canvas
      style={{ position: 'fixed', inset: 0, zIndex: 1, touchAction: 'none' }}
      dpr={[1, isMobile ? 1.5 : 2]}
      gl={{ antialias: !isMobile, alpha: true }}
      camera={{ fov: 46, near: 0.1, far: 100, position: [0, 1.7, 6.6] }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace
      }}
    >
      <AdaptiveDpr pixelated={false} />
      <SceneEnv />
      <CameraRig />
      <Scenery />
      <Ground />
      <Meadow />
      <Tree />
      <Blossoms />
      <DecorPapers />
      <WishPapers />
      <CalligraphyDesk />
      <Petals />
      <Rain />
      <Dew />
      <Critters />
    </Canvas>
  )
}
