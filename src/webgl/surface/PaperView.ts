import * as THREE from 'three';
import type { ViewportSize } from '@/core/Viewport';
import type { View } from '@/webgl/View';
import type { PaperOverlay } from './PaperOverlay';

export class PaperView implements View {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  constructor(readonly paper: PaperOverlay) {
    this.scene.background = new THREE.Color(1, 1, 1);
    this.scene.add(paper.mesh);
  }

  resize(_size: ViewportSize): void {}
}
