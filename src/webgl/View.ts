import type * as THREE from 'three';
import type { ViewportSize } from '@/core/Viewport';

export interface View {
  readonly scene: THREE.Scene;
  readonly camera: THREE.Camera;
  resize(size: ViewportSize): void;
  beforeRender?(renderer: THREE.WebGLRenderer): void;
}
