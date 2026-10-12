import * as THREE from 'three';
import { seededRandom } from '@/core/math';

const vertexShader = `
  attribute vec4 aShaft;
  uniform vec3 uSunDirection;
  uniform float uDepthSpan;
  varying vec2 vLocal;
  varying float vSeed;
  varying float vDepth;

  void main() {
    vec2 around = vec2(cos(aShaft.x), sin(aShaft.x)) * aShaft.y;
    vec3 center = vec3(cameraPosition.x + around.x, 0.0, cameraPosition.z + around.y);
    vec3 toCamera = normalize(vec3(cameraPosition.x - center.x, 0.0, cameraPosition.z - center.z));
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCamera));
    float depth = -position.y * uDepthSpan;
    vec2 slant = -uSunDirection.xz / max(uSunDirection.y, 0.25) * 0.35;
    vec3 world = center + right * position.x * aShaft.z + vec3(slant.x * -depth, depth, slant.y * -depth);
    vLocal = vec2(position.x, position.y);
    vSeed = aShaft.w;
    vDepth = depth;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uIntensity;
  varying vec2 vLocal;
  varying float vSeed;
  varying float vDepth;

  void main() {
    float edge = 1.0 - smoothstep(0.15, 0.5, abs(vLocal.x));
    float fall = pow(1.0 - vLocal.y, 2.2);
    float flicker = 0.55 + 0.45 * sin(uTime * (0.35 + vSeed * 0.5) + vSeed * 40.0 + vLocal.x * 3.0);
    float intensity = edge * fall * flicker * uIntensity * 0.9;
    gl_FragColor = vec4(vec3(intensity), 1.0);
  }
`;

export class LightShafts {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;

  constructor(count: number, sunDirection: THREE.IUniform) {
    const random = seededRandom(17);
    const quad = new THREE.PlaneGeometry(1, 1).translate(0, -0.5, 0).scale(1, -1, 1);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setIndex(quad.getIndex());
    geometry.setAttribute('position', quad.getAttribute('position'));
    geometry.instanceCount = count;
    const shafts = new Float32Array(count * 4);
    for (let i = 0; i < count; i += 1) {
      shafts.set([random() * Math.PI * 2, 4 + random() * 14, 1.2 + random() * 4.5, random()], i * 4);
    }
    geometry.setAttribute('aShaft', new THREE.InstancedBufferAttribute(shafts, 4));
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uSunDirection: sunDirection,
        uDepthSpan: { value: 46 },
        uTime: { value: 0 },
        uIntensity: { value: 0 },
      },
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
  }

  update(time: number, intensity: number): void {
    this.material.uniforms.uTime!.value = time;
    this.material.uniforms.uIntensity!.value = intensity;
    this.mesh.visible = intensity > 0.001;
  }
}
