import * as THREE from 'three';

export interface AtmospherePreset {
  sunElevation: number;
  sunAzimuth: number;
  horizonTone: number;
  zenithTone: number;
  sunGlow: number;
  sunDisc: number;
  cloudCover: number;
  cloudTone: number;
  deepTone: number;
  scatterTone: number;
  foamAmount: number;
  cloudShadow: number;
  hazeDensity: number;
  sunIntensity: number;
  waveScale: number;
}

export const SILVER_OVERCAST: AtmospherePreset = {
  sunElevation: 7,
  sunAzimuth: 24,
  horizonTone: 0.56,
  zenithTone: 0.16,
  sunGlow: 0.55,
  sunDisc: 2.4,
  cloudCover: 0.7,
  cloudTone: 0.42,
  deepTone: 0.01,
  scatterTone: 0.045,
  foamAmount: 0.65,
  cloudShadow: 0.85,
  hazeDensity: 0.0012,
  sunIntensity: 1,
  waveScale: 1,
};

export const PALE_DAWN: AtmospherePreset = {
  sunElevation: 3.5,
  sunAzimuth: -8,
  horizonTone: 0.9,
  zenithTone: 0.42,
  sunGlow: 1.2,
  sunDisc: 7,
  cloudCover: 0.42,
  cloudTone: 0.78,
  deepTone: 0.035,
  scatterTone: 0.08,
  foamAmount: 0.35,
  cloudShadow: 0.45,
  hazeDensity: 0.0016,
  sunIntensity: 1.3,
  waveScale: 0.55,
};

export function createAtmosphereUniforms(): Record<string, THREE.IUniform> {
  return {
    uSunDirection: { value: new THREE.Vector3(0, 0.1, -1).normalize() },
    uHorizonTone: { value: 0.5 },
    uZenithTone: { value: 0.2 },
    uSunGlow: { value: 0.5 },
    uSunDisc: { value: 1 },
    uCloudCover: { value: 0.6 },
    uCloudTone: { value: 0.5 },
    uWind: { value: new THREE.Vector2(0.6, 1) },
    uTime: { value: 0 },
    uUnderwater: { value: 0 },
    uWaterFogTone: { value: 0.1 },
    uWaterFogDensity: { value: 0.05 },
  };
}

export function sunDirection(preset: AtmospherePreset, target = new THREE.Vector3()): THREE.Vector3 {
  const elevation = THREE.MathUtils.degToRad(preset.sunElevation);
  const azimuth = THREE.MathUtils.degToRad(preset.sunAzimuth);
  return target
    .set(
      Math.sin(azimuth) * Math.cos(elevation),
      Math.sin(elevation),
      -Math.cos(azimuth) * Math.cos(elevation),
    )
    .normalize();
}

export function applyAtmosphere(
  preset: AtmospherePreset,
  atmosphere: Record<string, THREE.IUniform>,
  surface: Record<string, THREE.IUniform>,
): void {
  sunDirection(preset, atmosphere.uSunDirection!.value);
  atmosphere.uHorizonTone!.value = preset.horizonTone;
  atmosphere.uZenithTone!.value = preset.zenithTone;
  atmosphere.uSunGlow!.value = preset.sunGlow;
  atmosphere.uSunDisc!.value = preset.sunDisc;
  atmosphere.uCloudCover!.value = preset.cloudCover;
  atmosphere.uCloudTone!.value = preset.cloudTone;
  surface.uDeepTone!.value = preset.deepTone;
  surface.uScatterTone!.value = preset.scatterTone;
  surface.uFoamAmount!.value = preset.foamAmount;
  surface.uCloudShadow!.value = preset.cloudShadow;
  surface.uHazeDensity!.value = preset.hazeDensity;
  surface.uSunIntensity!.value = preset.sunIntensity;
  surface.uWaveScale!.value = preset.waveScale;
}
