import * as THREE from 'three';
import { seededRandom } from '@/core/math';

const vertexShader = `
  attribute vec4 aSeed;
  uniform float uAge;
  uniform vec3 uOrigin;
  uniform vec3 uForward;
  uniform float uPixelRatio;
  varying float vAlpha;

  void main() {
    float age = max(uAge - aSeed.w * 0.6, 0.0);
    vec3 right = normalize(cross(uForward, vec3(0.0, 1.0, 0.0)));
    vec3 spread = right * (aSeed.x - 0.5) * 3.2 + vec3(0.0, (aSeed.y - 0.5) * 2.4, 0.0);
    vec3 start = uOrigin + uForward * (0.8 + aSeed.z * 3.0) + spread;
    float rise = age * (1.4 + aSeed.z * 2.2) + age * age * 0.8;
    vec3 wobble = right * sin(age * (6.0 + aSeed.x * 6.0) + aSeed.y * 30.0) * 0.08;
    vec3 world = start + vec3(0.0, rise, 0.0) + wobble;
    vec4 view = viewMatrix * vec4(world, 1.0);
    vAlpha = smoothstep(0.0, 0.08, age) * (1.0 - smoothstep(1.2, 2.4, age)) * step(0.0, uAge);
    gl_PointSize = (2.0 + aSeed.y * 9.0) * uPixelRatio * 14.0 / max(-view.z, 0.3);
    gl_Position = projectionMatrix * view;
  }
`;

const fragmentShader = `
  varying float vAlpha;

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p);
    float rim = smoothstep(0.5, 0.42, d) * smoothstep(0.28, 0.42, d);
    float highlight = smoothstep(0.16, 0.0, length(p - vec2(-0.14, -0.14)));
    gl_FragColor = vec4(vec3((rim * 0.7 + highlight) * vAlpha), 1.0);
  }
`;

export class BubbleBurst {
  readonly points: THREE.Points;
  private readonly material: THREE.ShaderMaterial;
  private startedAt = -1;

  constructor(count: number) {
    const random = seededRandom(5);
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i += 1) seeds.set([random(), random(), random(), random()], i * 4);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 4));
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uAge: { value: -1 },
        uOrigin: { value: new THREE.Vector3() },
        uForward: { value: new THREE.Vector3(0, 0, -1) },
        uPixelRatio: { value: 1 },
      },
    });
    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.points.visible = false;
    this.points.renderOrder = 7;
  }

  trigger(time: number, camera: THREE.Camera): void {
    this.startedAt = time;
    this.material.uniforms.uOrigin!.value.copy(camera.position).add(new THREE.Vector3(0, -1.6, 0));
    camera.getWorldDirection(this.material.uniforms.uForward!.value);
  }

  update(time: number, pixelRatio: number): void {
    const age = this.startedAt < 0 ? -1 : time - this.startedAt;
    this.points.visible = age >= 0 && age < 3.2;
    this.material.uniforms.uAge!.value = age;
    this.material.uniforms.uPixelRatio!.value = pixelRatio;
  }
}
