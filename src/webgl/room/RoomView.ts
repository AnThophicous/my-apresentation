import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import type { QualityProfile } from '@/core/Quality';
import type { ViewportSize } from '@/core/Viewport';
import { createDissolveUniforms, dissolvePatch } from '@/webgl/materials/dissolve';
import { Person } from '@/webgl/person/Person';
import type { View } from '@/webgl/View';
import { buildBedroom } from './bedroom';
import { ClayPalette } from './clay';
import { SCREEN_CENTER } from './layout';
import type { Screen } from './Screen';
import { buildShell } from './shell';
import { buildWorkspace } from './workspace';

const PERSON_URL = `${import.meta.env.BASE_URL}models/person.glb`;

export class RoomView implements View {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(24, 1, 0.05, 80);
  readonly dissolve = createDissolveUniforms();
  readonly room = new THREE.Group();
  readonly screen: Screen;
  readonly chair: THREE.Group;
  person: Person | null = null;
  private readonly palette = new ClayPalette(this.dissolve);
  private readonly hitbox: THREE.Mesh;
  private readonly sun = new THREE.DirectionalLight(0xffffff, 3.1);
  private readonly screenLight = new THREE.PointLight(0xffffff, 0, 2.6, 1.5);
  private readonly lampLight: THREE.PointLight;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private shadowsDirty = true;

  constructor(private readonly quality: QualityProfile) {
    this.scene.background = new THREE.Color(3.4, 3.4, 3.4);
    this.room.add(buildShell(this.palette));
    const bedroom = buildBedroom(this.palette);
    this.lampLight = bedroom.lampLight;
    this.room.add(bedroom.group);
    const workspace = buildWorkspace(this.palette);
    this.screen = workspace.screen;
    this.hitbox = workspace.hitbox;
    this.chair = workspace.chair;
    this.room.add(workspace.group);
    this.room.add(this.createGroundShadow());
    this.scene.add(this.room);
    this.configureLights();
    this.dissolve.uDissolveOrigin.value.copy(SCREEN_CENTER);
  }

  async prepare(renderer: THREE.WebGLRenderer): Promise<void> {
    const environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = environment.texture;
    this.scene.environmentIntensity = 0.32;
  }

  async loadPerson(): Promise<Person> {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(PERSON_URL);
    const person = new Person(gltf, [dissolvePatch(this.dissolve)]);
    person.setShadows(true);
    this.person = person;
    this.room.add(person.root);
    this.invalidateShadows();
    return person;
  }

  invalidateShadows(): void {
    this.shadowsDirty = true;
  }

  pointsAtComputer(normalizedX: number, normalizedY: number): boolean {
    this.pointer.set(normalizedX, normalizedY);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster.intersectObject(this.hitbox, false).length > 0;
  }

  setScreenGlow(glow: number): void {
    this.screenLight.intensity = glow * 1.3;
  }

  resize(size: ViewportSize): void {
    this.camera.aspect = size.aspect;
    this.camera.updateProjectionMatrix();
  }

  beforeRender(renderer: THREE.WebGLRenderer): void {
    if (!this.shadowsDirty) return;
    renderer.shadowMap.needsUpdate = true;
    this.shadowsDirty = false;
  }

  private configureLights(): void {
    const hemisphere = new THREE.HemisphereLight(0xffffff, 0x5a5a5a, 0.5);
    const { sun } = this;
    sun.position.set(3.6, 6.8, 4.4);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(this.quality.shadowMapSize);
    sun.shadow.camera.left = -3.6;
    sun.shadow.camera.right = 3.6;
    sun.shadow.camera.top = 3.6;
    sun.shadow.camera.bottom = -3.6;
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 20;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.025;
    sun.shadow.radius = 3;
    this.screenLight.position.copy(SCREEN_CENTER).add(new THREE.Vector3(0.3, 0, 0));
    this.scene.add(hemisphere, sun, sun.target, this.screenLight);
    this.lampLight.castShadow = false;
  }

  private createGroundShadow(): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(128, 128, 30, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(0,0,0,0.5)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    const material = new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 7.4), material);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.2;
    shadow.renderOrder = -1;
    return shadow;
  }
}
