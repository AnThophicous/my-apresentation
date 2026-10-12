import { clamp } from './math';
import type { Viewport } from './Viewport';

export type QualityTier = 'low' | 'medium' | 'high';

export interface QualityProfile {
  tier: QualityTier;
  maxPixelRatio: number;
  minPixelRatio: number;
  msaaSamples: number;
  oceanRings: number;
  oceanSegments: number;
  oceanWaves: number;
  particleScale: number;
  shadowMapSize: number;
  shardCount: number;
}

const PROFILES: Record<QualityTier, QualityProfile> = {
  low: {
    tier: 'low',
    maxPixelRatio: 1,
    minPixelRatio: 0.6,
    msaaSamples: 0,
    oceanRings: 90,
    oceanSegments: 96,
    oceanWaves: 5,
    particleScale: 0.35,
    shadowMapSize: 512,
    shardCount: 700,
  },
  medium: {
    tier: 'medium',
    maxPixelRatio: 1.5,
    minPixelRatio: 0.75,
    msaaSamples: 2,
    oceanRings: 150,
    oceanSegments: 160,
    oceanWaves: 7,
    particleScale: 0.65,
    shadowMapSize: 1024,
    shardCount: 1400,
  },
  high: {
    tier: 'high',
    maxPixelRatio: 2,
    minPixelRatio: 0.85,
    msaaSamples: 4,
    oceanRings: 220,
    oceanSegments: 256,
    oceanWaves: 8,
    particleScale: 1,
    shadowMapSize: 2048,
    shardCount: 2400,
  },
};

const MOBILE_GPU_PATTERN = /(adreno|mali|powervr|apple gpu|intel\(r\) (hd|uhd)|swiftshader|llvmpipe|mesa)/i;

export function detectQuality(viewport: Viewport): QualityProfile {
  const forced = new URLSearchParams(window.location.search).get('quality');
  if (forced === 'low' || forced === 'medium' || forced === 'high') return PROFILES[forced];
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const gpu = readGpuName();
  const isWeakGpu = MOBILE_GPU_PATTERN.test(gpu);
  if (viewport.isTouch || memory <= 4 || cores <= 4) return PROFILES.low;
  if (isWeakGpu) return PROFILES.medium;
  return PROFILES.high;
}

function readGpuName(): string {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  if (!gl) return '';
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return name;
}

const SAMPLE_WINDOW = 45;
const SLOW_FRAME = 1 / 42;
const FAST_FRAME = 1 / 57;
const STEP = 0.1;

export class AdaptiveResolution {
  private samples: number[] = [];
  private scale = 1;

  constructor(
    private readonly profile: QualityProfile,
    private readonly devicePixelRatio: number,
  ) {}

  get pixelRatio(): number {
    const base = Math.min(this.devicePixelRatio, this.profile.maxPixelRatio);
    return clamp(base * this.scale, this.profile.minPixelRatio, this.profile.maxPixelRatio);
  }

  record(delta: number): boolean {
    this.samples.push(delta);
    if (this.samples.length < SAMPLE_WINDOW) return false;
    const average = this.samples.reduce((sum, value) => sum + value, 0) / this.samples.length;
    this.samples = [];
    const previous = this.pixelRatio;
    if (average > SLOW_FRAME) this.scale = clamp(this.scale - STEP, 0.4, 1);
    else if (average < FAST_FRAME) this.scale = clamp(this.scale + STEP * 0.5, 0.4, 1);
    return Math.abs(previous - this.pixelRatio) > 0.001;
  }
}
