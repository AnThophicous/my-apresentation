import * as THREE from 'three';

const glowFragment = `
  uniform float uIntensity;
  varying vec2 vUv;

  void main() {
    vec2 p = (vUv - 0.5) * vec2(1.0, 1.4);
    float glow = exp(-dot(p, p) * 7.0);
    gl_FragColor = vec4(vec3(glow * uIntensity), 1.0);
  }
`;

const panelFragment = `
  uniform float uIntensity;
  varying vec2 vUv;

  void main() {
    vec2 edge = min(vUv, 1.0 - vUv);
    float soft = smoothstep(0.0, 0.02, min(edge.x, edge.y));
    gl_FragColor = vec4(vec3(uIntensity * (0.85 + 0.15 * soft)), 1.0);
  }
`;

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export class Doorway {
  readonly group = new THREE.Group();
  private readonly panel: THREE.ShaderMaterial;
  private readonly glow: THREE.ShaderMaterial;

  constructor() {
    this.panel = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: panelFragment,
      uniforms: { uIntensity: { value: 0 } },
    });
    this.glow = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: glowFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uIntensity: { value: 0 } },
    });
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3), this.panel);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(14, 16), this.glow);
    glow.position.z = -0.05;
    this.group.add(glow, panel);
    this.group.visible = false;
  }

  update(position: THREE.Vector3, facing: THREE.Vector3, intensity: number): void {
    this.group.visible = intensity > 0.001;
    this.group.position.copy(position);
    this.group.lookAt(facing);
    this.panel.uniforms.uIntensity!.value = 1 + intensity * 7;
    this.glow.uniforms.uIntensity!.value = intensity * 0.9;
  }
}
