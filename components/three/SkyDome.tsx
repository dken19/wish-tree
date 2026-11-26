'use client'
import { useMemo } from 'react'
import * as THREE from 'three'
import { mulberry32 } from '@/lib/tree'
import { SHADER_OUTRO, skyUniforms } from '@/lib/skyPalette'
import { useIsMobile } from './useIsMobile'

// VÒM TRỜI tự vẽ (thay drei <Sky>): gradient đỉnh trời -> chân trời có dải sáng mỏng, quầng +
// đĩa mặt trời (theo uSunDir), đêm có TRĂNG + SAO lấp lánh. Màu lấy từ skyUniforms (SceneEnv
// chuyển mượt theo thời tiết). 1 sphere + 1 Points, không fog, không ghi depth.
export const SKY_RADIUS = 340

const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    vec4 p = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * p;
    gl_Position.z = gl_Position.w; // luôn nằm ở mặt xa nhất
  }
`

const skyFrag = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uHaze;
  uniform vec3 uSunDir;
  uniform float uSunAmt;
  uniform float uNight;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    float t = 1.0 - pow(1.0 - clamp(h, 0.0, 1.0), 4.0);
    vec3 col = mix(uHorizon, uTop, t);
    // dải sáng sát chân trời (không khí dày)
    col = mix(col, uHorizon * 1.03, exp(-max(h, 0.0) * 18.0) * 0.3);
    // dưới chân trời: hoà vào màu sương núi xa
    col = mix(col, uHaze, smoothstep(0.0, -0.2, h));

    // mặt trời: quầng rộng + quầng gần + đĩa
    float s = max(dot(d, normalize(uSunDir)), 0.0);
    vec3 sunCol = vec3(1.0, 0.9, 0.74);
    // quầng NHỎ & dịu (trước quầng rộng làm cả nửa trời trắng loá)
    col += sunCol * (pow(s, 24.0) * 0.07 + pow(s, 220.0) * 0.18 + pow(s, 2000.0) * 0.5) * uSunAmt;
    col = mix(col, vec3(1.15, 1.1, 1.0), smoothstep(0.9997, 0.99985, s) * uSunAmt);

    // trăng (đêm)
    vec3 md = normalize(vec3(-0.55, 0.36, -0.75));
    float m = max(dot(d, md), 0.0);
    col += vec3(0.45, 0.55, 0.85) * (pow(m, 18.0) * 0.18 + pow(m, 260.0) * 0.35) * uNight;
    col = mix(col, vec3(1.05, 1.03, 0.92), smoothstep(0.99925, 0.9995, m) * uNight);

    gl_FragColor = vec4(col, 1.0);
    ${SHADER_OUTRO}
  }
`

const starVert = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uNight;
  uniform float uPx;
  varying float vA;
  void main() {
    vec3 d = normalize(position);
    float tw = 0.65 + 0.35 * sin(uTime * (1.2 + aSeed * 2.5) + aSeed * 40.0);
    vA = uNight * tw * smoothstep(0.0, 0.1, d.y) * (0.5 + 0.5 * fract(aSeed * 7.13));
    vec4 p = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * p;
    gl_Position.z = gl_Position.w * 0.99999;
    gl_PointSize = uPx * (1.2 + fract(aSeed * 3.7) * 1.6);
  }
`
const starFrag = /* glsl */ `
  varying float vA;
  void main() {
    vec2 q = gl_PointCoord - 0.5;
    float a = smoothstep(0.5, 0.1, length(q)) * vA;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vec3(1.0, 0.97, 0.9) * a, a);
  }
`

export default function SkyDome() {
  const isMobile = useIsMobile()

  const skyMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: skyUniforms,
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    []
  )

  const N = isMobile ? 320 : 700
  const stars = useMemo(() => {
    const rng = mulberry32(0x57a2)
    const pos = new Float32Array(N * 3)
    const seed = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      const az = rng() * Math.PI * 2
      const y = Math.pow(rng(), 1.6) // dày hơn ở thấp — vùng camera hay nhìn thấy
      const r = Math.sqrt(1 - y * y)
      pos.set([Math.cos(az) * r * (SKY_RADIUS - 8), y * (SKY_RADIUS - 8), Math.sin(az) * r * (SKY_RADIUS - 8)], i * 3)
      seed[i] = rng()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    return g
  }, [N])

  const starMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: skyUniforms.uTime,
          uNight: skyUniforms.uNight,
          uPx: { value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2) },
        },
        vertexShader: starVert,
        fragmentShader: starFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    []
  )

  return (
    <group>
      <mesh material={skyMat} renderOrder={-10} frustumCulled={false}>
        <sphereGeometry args={[SKY_RADIUS, 48, 24]} />
      </mesh>
      <points geometry={stars} material={starMat} renderOrder={-9} frustumCulled={false} />
    </group>
  )
}
