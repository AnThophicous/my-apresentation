import * as THREE from 'three';
import { dissolvePatch, type DissolveUniforms } from '@/webgl/materials/dissolve';
import { applyPatches } from '@/webgl/materials/patch';

export interface ClayOptions {
  roughness?: number;
  map?: THREE.Texture;
  emissive?: number;
  side?: THREE.Side;
}

export class ClayPalette {
  private readonly cache = new Map<string, THREE.MeshStandardMaterial>();

  constructor(private readonly dissolve: DissolveUniforms) {}

  get(tone: number, options: ClayOptions = {}): THREE.MeshStandardMaterial {
    const key = `${tone}|${options.roughness ?? 0.85}|${options.map?.uuid ?? ''}|${options.emissive ?? 0}|${options.side ?? 0}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(tone, tone, tone),
      roughness: options.roughness ?? 0.85,
      metalness: 0,
      map: options.map ?? null,
      emissive: new THREE.Color(options.emissive ?? 0, options.emissive ?? 0, options.emissive ?? 0),
      side: options.side ?? THREE.FrontSide,
    });
    applyPatches(material, [dissolvePatch(this.dissolve)]);
    this.cache.set(key, material);
    return material;
  }

  all(): THREE.MeshStandardMaterial[] {
    return [...this.cache.values()];
  }
}

export function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  castShadow = true,
): THREE.Mesh {
  const result = new THREE.Mesh(geometry, material);
  result.castShadow = castShadow;
  result.receiveShadow = true;
  return result;
}

export function place<T extends THREE.Object3D>(
  object: T,
  x: number,
  y: number,
  z: number,
  rotationY = 0,
): T {
  object.position.set(x, y, z);
  object.rotation.y = rotationY;
  return object;
}
