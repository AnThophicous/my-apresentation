import * as THREE from 'three';
import noise from '@/webgl/glsl/noise.glsl?raw';
import { createFullscreenTriangle } from '@/webgl/post/FinalPass';
import vertexShader from '@/webgl/post/fullscreen.vert.glsl?raw';
import atmosphere from './atmosphere.glsl?raw';
import fragmentMain from './sky.frag.glsl?raw';

export class Sky {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;

  constructor(sharedUniforms: Record<string, THREE.IUniform>) {
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: [noise, atmosphere, fragmentMain].join('\n'),
      depthTest: false,
      depthWrite: false,
      uniforms: {
        ...sharedUniforms,
        uInverseProjection: { value: new THREE.Matrix4() },
        uCameraWorld: { value: new THREE.Matrix4() },
      },
    });
    this.mesh = new THREE.Mesh(createFullscreenTriangle(), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -10;
  }

  follow(camera: THREE.PerspectiveCamera): void {
    this.material.uniforms.uInverseProjection!.value.copy(camera.projectionMatrixInverse);
    this.material.uniforms.uCameraWorld!.value.copy(camera.matrixWorld);
  }
}
