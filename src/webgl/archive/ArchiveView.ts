import * as THREE from 'three';
import type { QualityProfile } from '@/core/Quality';
import { damp, seededRandom } from '@/core/math';
import type { ViewportSize } from '@/core/Viewport';
import { LightShafts } from '@/webgl/ocean/LightShafts';
import { MarineSnow } from '@/webgl/ocean/MarineSnow';
import type { View } from '@/webgl/View';

const SPACING = 7.5;
const FOCUS_DISTANCE = 4.2;

interface FloatingBook {
  mesh: THREE.Mesh;
  home: THREE.Vector3;
  phase: number;
  spin: number;
  focus: number;
}

export interface ArchiveState {
  time: number;
  delta: number;
  depth: number;
  pixelRatio: number;
  focus: number;
  parallaxX: number;
  parallaxY: number;
}

export class ArchiveView implements View {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(45, 1, 0.05, 200);
  private readonly sunDirection = { value: new THREE.Vector3(0.2, 1, -0.3).normalize() };
  private readonly shafts: LightShafts;
  private readonly snow: MarineSnow;
  private readonly lantern = new THREE.PointLight(0xffffff, 6, 16, 1.4);
  private readonly books: FloatingBook[] = [];
  private readonly target = new THREE.Vector3();
  private readonly front = new THREE.Vector3();

  constructor(quality: QualityProfile) {
    this.scene.background = new THREE.Color(0.004, 0.004, 0.004);
    this.scene.fog = new THREE.FogExp2(0x020202, 0.06);
    this.shafts = new LightShafts(quality.tier === 'low' ? 6 : 12, this.sunDirection);
    this.snow = new MarineSnow(Math.round(2200 * quality.particleScale));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(2, 10, 4);
    this.scene.add(
      new THREE.HemisphereLight(0xffffff, 0x0a0a0a, 0.35),
      key,
      this.lantern,
      this.shafts.mesh,
      this.snow.points,
    );
  }

  get hasBooks(): boolean {
    return this.books.length > 0;
  }

  adoptBooks(sources: readonly THREE.Mesh[]): void {
    const random = seededRandom(41);
    sources.forEach((source, index) => {
      const mesh = new THREE.Mesh(source.geometry, source.material);
      const side = index % 2 === 0 ? -1 : 1;
      const home = new THREE.Vector3(
        side * (2.7 + random() * 1.4),
        -3 - index * SPACING,
        -6.5 - random() * 3,
      );
      mesh.position.copy(home);
      mesh.rotation.set(random() * Math.PI, random() * Math.PI * 2, random() * Math.PI);
      this.scene.add(mesh);
      this.books.push({ mesh, home, phase: random() * Math.PI * 2, spin: 0.08 + random() * 0.12, focus: 0 });
    });
  }

  get depthSpan(): number {
    return Math.max(SPACING * this.books.length, 30);
  }

  resize(size: ViewportSize): void {
    this.camera.aspect = size.aspect;
    this.camera.fov = size.isPortrait ? 60 : 45;
    this.camera.updateProjectionMatrix();
  }

  update(state: ArchiveState): void {
    const { camera } = this;
    camera.position.set(state.parallaxX * 0.4, -state.depth, state.parallaxY * -0.2);
    camera.rotation.set(-0.06 + state.parallaxY * 0.03, -state.parallaxX * 0.05, 0);
    camera.updateMatrixWorld();
    this.lantern.position.copy(camera.position);
    this.books.forEach((book, index) => {
      book.focus = damp(book.focus, index === state.focus ? 1 : 0, 4, state.delta);
      const bob = Math.sin(state.time * 0.5 + book.phase) * 0.25;
      this.target.copy(book.home);
      this.target.y += bob;
      if (book.focus > 0.001) {
        this.front.set(book.home.x * 0.45, camera.position.y - 0.2, -FOCUS_DISTANCE);
        this.target.lerp(this.front, book.focus);
      }
      book.mesh.position.copy(this.target);
      book.mesh.rotation.y += state.delta * book.spin * (1 - book.focus);
      book.mesh.rotation.x += state.delta * book.spin * 0.4 * (1 - book.focus);
      if (book.focus > 0.001)
        book.mesh.quaternion.slerp(camera.quaternion, Math.min(1, book.focus * state.delta * 6));
    });
    const depth = state.depth;
    this.shafts.update(state.time, Math.exp(-depth * 0.025) * 0.55);
    this.snow.update(state.time, 1, state.pixelRatio);
  }
}
