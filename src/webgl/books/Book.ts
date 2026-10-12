import * as THREE from 'three';
import type { BookEntry } from '@/content/books';
import { createBookGeometry } from './bookGeometry';
import { paintAtlas } from './coverArt';

export type BookState = 'idle' | 'rising' | 'held' | 'surfaced';

const BASE_WIDTH = 0.92;

export interface CausticUniforms {
  uCausticTime: THREE.IUniform<number>;
  uCausticStrength: THREE.IUniform<number>;
}

export function createCausticUniforms(): CausticUniforms {
  return { uCausticTime: { value: 0 }, uCausticStrength: { value: 0 } };
}

const CAUSTIC_VERTEX = `
  #include <project_vertex>
  vCausticWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vCausticNormal = normalize(mat3(modelMatrix) * objectNormal);
`;

const CAUSTIC_FRAGMENT = `
  float causticAt(vec2 p, float time) {
    vec2 i = p;
    float c = 1.0;
    float inten = 0.005;
    for (int n = 0; n < 4; n++) {
      float t = time * (1.0 - (3.5 / float(n + 1)));
      i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
      c += 1.0 / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));
    }
    c /= 4.0;
    c = 1.17 - pow(c, 1.4);
    return pow(abs(c), 8.0);
  }
`;

export class Book {
  readonly mesh: THREE.Mesh;
  readonly atlas: HTMLCanvasElement;
  readonly velocity = new THREE.Vector3();
  readonly spinAxis = new THREE.Vector3(0, 1, 0);
  state: BookState = 'idle';
  spinRate = 0;
  riseSpeed = 1;
  phase = Math.random() * Math.PI * 2;
  heldDistance = 0;

  constructor(
    readonly entry: BookEntry,
    readonly index: number,
    atlasSize: number,
    anisotropy: number,
    caustics: CausticUniforms,
  ) {
    this.atlas = paintAtlas(entry, index, atlasSize);
    const texture = new THREE.CanvasTexture(this.atlas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = anisotropy;
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.66, metalness: 0 });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, caustics);
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          '#include <common>\nvarying vec3 vCausticWorld;\nvarying vec3 vCausticNormal;',
        )
        .replace('#include <project_vertex>', CAUSTIC_VERTEX);
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>\nuniform float uCausticTime;\nuniform float uCausticStrength;\nvarying vec3 vCausticWorld;\nvarying vec3 vCausticNormal;\n${CAUSTIC_FRAGMENT}`,
        )
        .replace(
          '#include <fog_fragment>',
          `float causticLight = causticAt(vCausticWorld.xz * 1.4, uCausticTime * 0.6) * max(vCausticNormal.y * 0.7 + 0.3, 0.0);\ngl_FragColor.rgb += gl_FragColor.rgb * causticLight * uCausticStrength * 2.5;\n#include <fog_fragment>`,
        );
    };
    const width = BASE_WIDTH;
    this.mesh = new THREE.Mesh(
      createBookGeometry(entry.ratio, {
        width,
        height: width / entry.ratio,
        thickness: 0.08 + entry.thickness * 0.1,
      }),
      material,
    );
    this.mesh.visible = false;
    this.mesh.userData.book = this;
  }
}
