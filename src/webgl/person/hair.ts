import * as THREE from 'three';
import noise from '@/webgl/glsl/noise.glsl?raw';
import type { ShaderPatch } from '@/webgl/materials/patch';

const STRAND_DEPTH = 0.0016;

export function hairPatch(geometry: THREE.BufferGeometry): ShaderPatch {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const size = box.getSize(new THREE.Vector3());
  return {
    key: 'hair',
    uniforms: {
      uHairCenter: { value: box.getCenter(new THREE.Vector3()) },
      uHairInverseSize: { value: new THREE.Vector3(1 / size.x, 1 / size.y, 1 / size.z) },
    },
    vertex: [
      [
        '#include <common>',
        '#include <common>\nuniform vec3 uHairCenter;\nuniform vec3 uHairInverseSize;\nvarying vec3 vHairLocal;',
      ],
      [
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvHairLocal = (position - uHairCenter) * uHairInverseSize;',
      ],
    ],
    fragment: [
      [
        '#include <common>',
        `#include <common>
        varying vec3 vHairLocal;
        ${noise}
        float hairHeight() {
          vec3 fromCrown = vHairLocal - vec3(0.0, 0.5, -0.16);
          float azimuth = atan(fromCrown.x, fromCrown.z);
          float radius = length(fromCrown.xz);
          float warp = fbm3(vHairLocal * 4.0) * 3.2;
          float coarsePhase = azimuth * 64.0 + warp + radius * 7.0;
          float finePhase = azimuth * 172.0 + warp * 1.8;
          float coarse = sin(coarsePhase) * 0.5 + 0.5;
          float fine = sin(finePhase) * 0.5 + 0.5;
          float coarseDetail = 1.0 - smoothstep(0.7, 1.7, fwidth(coarsePhase));
          float fineDetail = 1.0 - smoothstep(0.7, 1.7, fwidth(finePhase));
          float whorl = smoothstep(0.03, 0.18, radius);
          float clumps = fbm3(vec3(cos(azimuth), sin(azimuth), radius * 1.6) * 2.6);
          float strands = mix(0.5, coarse, coarseDetail) * 0.62 + mix(0.5, fine, fineDetail) * 0.38;
          return mix(0.5, strands, whorl) * 0.72 + clumps * 0.28;
        }
        vec3 perturbHair(vec3 surface, vec3 baseNormal, float height) {
          vec3 sigmaX = dFdx(surface);
          vec3 sigmaY = dFdy(surface);
          vec3 r1 = cross(sigmaY, baseNormal);
          vec3 r2 = cross(baseNormal, sigmaX);
          float determinant = dot(sigmaX, r1);
          vec2 slope = vec2(dFdx(height), dFdy(height)) * ${STRAND_DEPTH};
          vec3 gradient = sign(determinant) * (slope.x * r1 + slope.y * r2);
          return normalize(abs(determinant) * baseNormal - gradient);
        }`,
      ],
      [
        '#include <color_fragment>',
        '#include <color_fragment>\nfloat hairStrand = hairHeight();\ndiffuseColor.rgb *= 0.7 + hairStrand * 0.6;',
      ],
      [
        '#include <normal_fragment_maps>',
        '#include <normal_fragment_maps>\nnormal = perturbHair(-vViewPosition, normal, hairStrand);',
      ],
    ],
  };
}
