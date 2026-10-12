import * as THREE from 'three';
import { seededRandom } from '@/core/math';

const FIELD_SIZE = 26;

const vertexShader = `
  attribute float aSize;
  uniform float uTime;
  uniform float uField;
  uniform float uPixelRatio;
  varying float vFade;

  void main() {
    vec3 drift = vec3(sin(uTime * 0.07 + position.y * 9.0) * 0.6, -uTime * 0.18, cos(uTime * 0.05 + position.x * 7.0) * 0.5);
    vec3 local = mod(position * uField + drift - cameraPosition + uField * 0.5, uField) - uField * 0.5;
    vec3 world = cameraPosition + local;
    vec4 view = viewMatrix * vec4(world, 1.0);
    float distanceToCamera = -view.z;
    vFade = smoothstep(0.4, 2.0, distanceToCamera) * (1.0 - smoothstep(uField * 0.25, uField * 0.5, length(local)));
    gl_PointSize = aSize * uPixelRatio * 28.0 / max(distanceToCamera, 0.5);
    gl_Position = projectionMatrix * view;
  }
`;

const fragmentShader = `
  uniform float uIntensity;
  varying float vFade;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float speck = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vec3(speck * vFade * uIntensity * 0.35), 1.0);
  }
`;

export class MarineSnow {
  readonly points: THREE.Points;
  private readonly material: THREE.ShaderMaterial;

  constructor(count: number) {
    const random = seededRandom(91);
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      positions.set([random(), random(), random()], i * 3);
      sizes[i] = 0.3 + Math.pow(random(), 4) * 1.4;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uField: { value: FIELD_SIZE },
        uPixelRatio: { value: 1 },
        uIntensity: { value: 0 },
      },
    });
    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 6;
  }

  update(time: number, intensity: number, pixelRatio: number): void {
    const u = this.material.uniforms;
    u.uTime!.value = time;
    u.uIntensity!.value = intensity;
    u.uPixelRatio!.value = pixelRatio;
    this.points.visible = intensity > 0.001;
  }
}
