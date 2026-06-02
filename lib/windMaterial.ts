// Material gió chạy GPU: uốn đỉnh cỏ/cây theo thời gian trong vertex shader.
// -> KHÔNG cập nhật từng instance bằng JS mỗi frame (giữ mobile mượt).
import * as THREE from 'three'

type WindOpts = {
  color?: number
  side?: THREE.Side
  amp?: number // biên độ uốn ngang
  swayZ?: number // biên độ theo trục z
  speed?: number
}

export type WindMaterial = THREE.MeshLambertMaterial & {
  tick: (time: number, wind: number) => void
}

export function makeWindMaterial(opts: WindOpts = {}): WindMaterial {
  const amp = opts.amp ?? 0.12
  const swayZ = opts.swayZ ?? 0.08
  const speed = opts.speed ?? 1.5

  const mat = new THREE.MeshLambertMaterial({
    color: opts.color ?? 0xffffff,
    side: opts.side ?? THREE.DoubleSide,
  }) as WindMaterial

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 }
    shader.uniforms.uWind = { value: 1 }
    shader.vertexShader =
      'uniform float uTime;\nuniform float uWind;\n' + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float ph = instanceMatrix[3][0] * 0.7 + instanceMatrix[3][2] * 0.7;
      #else
        float ph = 0.0;
      #endif
      float wH = max(transformed.y, 0.0);          // càng cao càng uốn nhiều
      transformed.x += sin(uTime * ${speed.toFixed(2)} + ph) * ${amp.toFixed(3)} * uWind * wH;
      transformed.z += cos(uTime * ${(speed * 0.8).toFixed(2)} + ph) * ${swayZ.toFixed(3)} * uWind * wH;
      `
    )
    mat.userData.shader = shader
  }

  mat.tick = (time: number, wind: number) => {
    const sh = mat.userData.shader as
      | { uniforms: { uTime: { value: number }; uWind: { value: number } } }
      | undefined
    if (sh) {
      sh.uniforms.uTime.value = time
      sh.uniforms.uWind.value = wind
    }
  }

  return mat
}
