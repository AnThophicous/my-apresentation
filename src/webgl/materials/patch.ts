import type * as THREE from 'three';

export type Replacement = readonly [search: string, replacement: string];

export interface ShaderPatch {
  key: string;
  uniforms?: Record<string, THREE.IUniform>;
  vertex?: readonly Replacement[];
  fragment?: readonly Replacement[];
}

export function applyPatches(material: THREE.Material, patches: readonly ShaderPatch[]): void {
  material.onBeforeCompile = (shader) => {
    for (const patch of patches) {
      Object.assign(shader.uniforms, patch.uniforms);
      patch.vertex?.forEach(([search, replacement]) => {
        shader.vertexShader = shader.vertexShader.replace(search, replacement);
      });
      patch.fragment?.forEach(([search, replacement]) => {
        shader.fragmentShader = shader.fragmentShader.replace(search, replacement);
      });
    }
  };
  material.customProgramCacheKey = () => patches.map((patch) => patch.key).join('|');
  material.needsUpdate = true;
}
