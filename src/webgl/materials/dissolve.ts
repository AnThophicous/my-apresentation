import * as THREE from 'three';
import noise from '@/webgl/glsl/noise.glsl?raw';
import type { ShaderPatch } from './patch';

const SPREAD = 0.22;

export interface DissolveUniforms {
  uDissolve: THREE.IUniform<number>;
  uDissolveOrigin: THREE.IUniform<THREE.Vector3>;
  uDissolveReach: THREE.IUniform<number>;
  uDissolveScale: THREE.IUniform<number>;
  uDissolveEdgeTone: THREE.IUniform<number>;
  uDissolveTime: THREE.IUniform<number>;
}

export function createDissolveUniforms(): DissolveUniforms {
  return {
    uDissolve: { value: 0 },
    uDissolveOrigin: { value: new THREE.Vector3() },
    uDissolveReach: { value: 4 },
    uDissolveScale: { value: 3.2 },
    uDissolveEdgeTone: { value: 0 },
    uDissolveTime: { value: 0 },
  };
}

export function dissolvePatch(uniforms: DissolveUniforms): ShaderPatch {
  return {
    key: 'dissolve',
    uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
    vertex: [
      ['#include <common>', '#include <common>\nvarying vec3 vDissolveWorld;'],
      [
        '#include <project_vertex>',
        `#include <project_vertex>
        #ifdef USE_INSTANCING
          vDissolveWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        #else
          vDissolveWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
        #endif`,
      ],
    ],
    fragment: [
      [
        '#include <common>',
        `#include <common>
        uniform float uDissolve;
        uniform vec3 uDissolveOrigin;
        uniform float uDissolveReach;
        uniform float uDissolveScale;
        uniform float uDissolveEdgeTone;
        uniform float uDissolveTime;
        varying vec3 vDissolveWorld;
        ${noise}
        float dissolveEdge() {
          float pattern = (fbm3(vDissolveWorld * uDissolveScale) - 0.5) * 2.2 + (hash13(floor(vDissolveWorld * 140.0)) - 0.5) * 0.35;
          float order = 1.0 - clamp(length(vDissolveWorld - uDissolveOrigin) / uDissolveReach, 0.0, 1.0);
          float sweep = uDissolve * (1.0 + ${SPREAD * 2}) - ${SPREAD};
          return order + pattern * ${SPREAD} - sweep;
        }`,
      ],
      [
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        float dissolveDistance = dissolveEdge();
        if (uDissolve > 0.0 && dissolveDistance < 0.0) discard;`,
      ],
      [
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        if (uDissolve > 0.0) {
          float rim = 1.0 - smoothstep(0.0, 0.035, dissolveDistance);
          float flicker = hash13(vec3(floor(gl_FragCoord.xy * 0.5), floor(uDissolveTime * 24.0)));
          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(uDissolveEdgeTone), rim * (0.55 + 0.45 * flicker));
        }`,
      ],
    ],
  };
}
