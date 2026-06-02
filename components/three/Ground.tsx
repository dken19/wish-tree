'use client'
// Mặt đất low-poly + gò đất + bóng đổ giả (đĩa mềm, không dùng shadow map cho nhẹ).
export default function Ground() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02}>
        <circleGeometry args={[9, 7]} />
        <meshLambertMaterial color={0xb9d2a6} flatShading />
      </mesh>
      <mesh position-y={-0.2}>
        <coneGeometry args={[1.5, 0.5, 8]} />
        <meshLambertMaterial color={0xc7b596} flatShading />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.01}>
        <circleGeometry args={[2.4, 24]} />
        <meshBasicMaterial color={0x000000} transparent opacity={0.12} />
      </mesh>
    </group>
  )
}
