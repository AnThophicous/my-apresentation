import * as THREE from 'three';
import { layoutAtlas, type Rect } from './coverArt';

type FaceName = 'px' | 'nx' | 'py' | 'ny' | 'pz' | 'nz';

interface FaceUv {
  rect: Rect;
  rotate?: boolean;
}

interface FaceFrame {
  normal: THREE.Vector3;
  right: THREE.Vector3;
  up: THREE.Vector3;
}

const FACES: Record<FaceName, FaceFrame> = {
  pz: {
    normal: new THREE.Vector3(0, 0, 1),
    right: new THREE.Vector3(1, 0, 0),
    up: new THREE.Vector3(0, 1, 0),
  },
  nz: {
    normal: new THREE.Vector3(0, 0, -1),
    right: new THREE.Vector3(-1, 0, 0),
    up: new THREE.Vector3(0, 1, 0),
  },
  px: {
    normal: new THREE.Vector3(1, 0, 0),
    right: new THREE.Vector3(0, 0, -1),
    up: new THREE.Vector3(0, 1, 0),
  },
  nx: {
    normal: new THREE.Vector3(-1, 0, 0),
    right: new THREE.Vector3(0, 0, 1),
    up: new THREE.Vector3(0, 1, 0),
  },
  py: {
    normal: new THREE.Vector3(0, 1, 0),
    right: new THREE.Vector3(1, 0, 0),
    up: new THREE.Vector3(0, 0, -1),
  },
  ny: {
    normal: new THREE.Vector3(0, -1, 0),
    right: new THREE.Vector3(1, 0, 0),
    up: new THREE.Vector3(0, 0, 1),
  },
};

class FaceBuilder {
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];
  private readonly uvs: number[] = [];
  private readonly indices: number[] = [];

  addBox(center: THREE.Vector3, size: THREE.Vector3, faces: Partial<Record<FaceName, FaceUv>>): void {
    (Object.keys(faces) as FaceName[]).forEach((name) =>
      this.addFace(center, size, FACES[name], faces[name]!),
    );
  }

  build(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    geometry.setIndex(this.indices);
    geometry.computeBoundingSphere();
    return geometry;
  }

  private addFace(center: THREE.Vector3, size: THREE.Vector3, frame: FaceFrame, uv: FaceUv): void {
    const half = size.clone().multiplyScalar(0.5);
    const extent = (axis: THREE.Vector3): number => Math.abs(axis.dot(half));
    const faceCenter = center.clone().addScaledVector(frame.normal, extent(frame.normal));
    const halfRight = extent(frame.right);
    const halfUp = extent(frame.up);
    const base = this.positions.length / 3;
    const corners: readonly [number, number][] = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];
    corners.forEach(([sx, sy]) => {
      const point = faceCenter
        .clone()
        .addScaledVector(frame.right, sx * halfRight)
        .addScaledVector(frame.up, sy * halfUp);
      this.positions.push(point.x, point.y, point.z);
      this.normals.push(frame.normal.x, frame.normal.y, frame.normal.z);
      const u = (sx + 1) / 2;
      const v = (sy + 1) / 2;
      const [mappedU, mappedV] = uv.rotate ? [1 - v, u] : [u, v];
      this.uvs.push(uv.rect.x + mappedU * uv.rect.width, 1 - (uv.rect.y + (1 - mappedV) * uv.rect.height));
    });
    this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}

export interface BookDimensions {
  width: number;
  height: number;
  thickness: number;
}

const BOARD = 0.022;
const INSET = 0.018;

export function createBookGeometry(ratio: number, dimensions: BookDimensions): THREE.BufferGeometry {
  const { width, height, thickness } = dimensions;
  const atlas = layoutAtlas(ratio);
  const edge: FaceUv = { rect: atlas.edge };
  const builder = new FaceBuilder();
  builder.addBox(
    new THREE.Vector3(0, 0, thickness / 2 - BOARD / 2),
    new THREE.Vector3(width, height, BOARD),
    {
      pz: { rect: atlas.front },
      px: edge,
      py: edge,
      ny: edge,
    },
  );
  builder.addBox(
    new THREE.Vector3(0, 0, -thickness / 2 + BOARD / 2),
    new THREE.Vector3(width, height, BOARD),
    {
      nz: { rect: atlas.back },
      px: edge,
      py: edge,
      ny: edge,
    },
  );
  builder.addBox(
    new THREE.Vector3(-width / 2 + BOARD / 2, 0, 0),
    new THREE.Vector3(BOARD, height, thickness),
    {
      nx: { rect: atlas.spine, rotate: true },
      py: edge,
      ny: edge,
    },
  );
  const blockWidth = width - BOARD - INSET;
  builder.addBox(
    new THREE.Vector3(-width / 2 + BOARD + blockWidth / 2, 0, 0),
    new THREE.Vector3(blockWidth, height - INSET * 2, thickness - BOARD * 2),
    {
      px: { rect: atlas.pagesAlong },
      py: { rect: atlas.pagesAcross },
      ny: { rect: atlas.pagesAcross },
    },
  );
  return builder.build();
}
