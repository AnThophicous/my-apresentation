import * as THREE from 'three';
import type { QualityProfile } from '@/core/Quality';
import type { ViewportSize } from '@/core/Viewport';
import type { HorizonLine } from '@/webgl/surface/HorizonLine';
import { PaperOverlay } from '@/webgl/surface/PaperOverlay';
import type { View } from '@/webgl/View';
import {
  applyAtmosphere,
  createAtmosphereUniforms,
  SILVER_OVERCAST,
  type AtmospherePreset,
} from './atmosphere';
import { BubbleBurst } from './BubbleBurst';
import { Doorway } from './Doorway';
import { LightShafts } from './LightShafts';
import { MarineSnow } from './MarineSnow';
import { OceanSurface } from './OceanSurface';
import { Sky } from './Sky';
import { SWELL, waveHeight } from './waves';

export interface OceanViewState {
  time: number;
  pixelRatio: number;
  shafts: number;
  snow: number;
}

const SURFACE_FOG_TONE = 0.085;
const FOG_FALLOFF = 0.06;

export class OceanView implements View {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(40, 1, 0.05, 4000);
  readonly atmosphere = createAtmosphereUniforms();
  readonly paper: PaperOverlay;
  readonly surface: OceanSurface;
  readonly bubbles: BubbleBurst;
  readonly doorway = new Doorway();
  readonly content = new THREE.Group();
  private readonly sky: Sky;
  private readonly shafts: LightShafts;
  private readonly snow: MarineSnow;
  private readonly sun = new THREE.DirectionalLight(0xffffff, 2.4);
  private readonly ambient = new THREE.HemisphereLight(0xffffff, 0x101010, 0.6);
  private readonly lantern = new THREE.PointLight(0xffffff, 0, 14, 1.4);
  private readonly fog = new THREE.FogExp2(0x000000, 0.05);
  private waterLevel = 0;
  private underwater = false;

  constructor(quality: QualityProfile, line: HorizonLine) {
    this.sky = new Sky(this.atmosphere);
    this.surface = new OceanSurface(
      { rings: quality.oceanRings, segments: quality.oceanSegments, innerRadius: 0.6, outerRadius: 3200 },
      SWELL.slice(0, quality.oceanWaves),
      this.atmosphere,
    );
    this.paper = new PaperOverlay(line);
    this.shafts = new LightShafts(quality.tier === 'low' ? 8 : 16, this.atmosphere.uSunDirection!);
    this.snow = new MarineSnow(Math.round(2600 * quality.particleScale));
    this.bubbles = new BubbleBurst(Math.round(220 * Math.max(0.5, quality.particleScale)));
    this.scene.fog = this.fog;
    this.scene.add(
      this.sky.mesh,
      this.surface.mesh,
      this.shafts.mesh,
      this.snow.points,
      this.bubbles.points,
      this.doorway.group,
      this.content,
      this.sun,
      this.sun.target,
      this.ambient,
      this.lantern,
      this.paper.mesh,
    );
    this.setPreset(SILVER_OVERCAST);
  }

  get isUnderwater(): boolean {
    return this.underwater;
  }

  get depth(): number {
    return Math.max(0, this.waterLevel - this.camera.position.y);
  }

  get clearance(): number {
    return this.camera.position.y - this.waterLevel;
  }

  setPreset(preset: AtmospherePreset): void {
    applyAtmosphere(preset, this.atmosphere, this.surface.material.uniforms);
    this.sun.position.copy(this.atmosphere.uSunDirection!.value).multiplyScalar(50);
  }

  waterHeightAt(x: number, z: number, time: number): number {
    return waveHeight(SWELL, x, z, time, this.surface.material.uniforms.uWaveScale!.value);
  }

  resize(size: ViewportSize): void {
    this.camera.aspect = size.aspect;
    this.camera.fov = size.isPortrait ? 58 : 40;
    this.camera.updateProjectionMatrix();
  }

  update(state: OceanViewState): void {
    const { camera } = this;
    camera.updateMatrixWorld();
    this.waterLevel = this.waterHeightAt(camera.position.x, camera.position.z, state.time);
    this.underwater = camera.position.y < this.waterLevel - 0.02;
    const depth = this.depth;
    const fogTone = SURFACE_FOG_TONE * Math.exp(-depth * FOG_FALLOFF);
    const fogDensity = this.underwater ? 0.05 + Math.min(depth, 60) * 0.0012 : 0.00045;
    this.atmosphere.uTime!.value = state.time;
    this.atmosphere.uUnderwater!.value = this.underwater ? 1 : 0;
    this.atmosphere.uWaterFogTone!.value = fogTone;
    this.atmosphere.uWaterFogDensity!.value = fogDensity;
    this.surface.material.uniforms.uWaveTime!.value = state.time;
    this.fog.color.setScalar(this.underwater ? fogTone : this.atmosphere.uHorizonTone!.value);
    this.fog.density = fogDensity;
    this.sun.intensity = this.underwater ? 2.6 * Math.exp(-depth * 0.04) : 2.4;
    this.ambient.intensity = this.underwater ? 0.9 * Math.exp(-depth * 0.035) : 0.6;
    this.lantern.position.copy(camera.position);
    this.lantern.intensity = this.underwater ? Math.min(1, depth / 14) * 7 : 0;
    this.surface.follow(camera);
    this.sky.follow(camera);
    this.shafts.update(state.time, this.underwater ? state.shafts * Math.exp(-depth * 0.035) : 0);
    this.snow.update(state.time, this.underwater ? state.snow : 0, state.pixelRatio);
    this.bubbles.update(state.time, state.pixelRatio);
  }
}
