const CORNERS = [
  [0, 0, 0],
  [1, 0, 0],
  [0, 1, 0],
  [1, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [0, 1, 1],
  [1, 1, 1],
];

const EDGES = [
  [0, 1],
  [2, 3],
  [4, 5],
  [6, 7],
  [0, 2],
  [1, 3],
  [4, 6],
  [5, 7],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
];

export function sampleField(grid, distance, cullDistance) {
  const { nx, ny, nz, origin, step, block } = grid;
  const field = new Float32Array(nx * ny * nz).fill(1);
  const reach = Math.sqrt(3) * block * step;
  for (let bz = 0; bz < nz; bz += block) {
    for (let by = 0; by < ny; by += block) {
      for (let bx = 0; bx < nx; bx += block) {
        const cx = origin[0] + (bx + block / 2) * step;
        const cy = origin[1] + (by + block / 2) * step;
        const cz = origin[2] + (bz + block / 2) * step;
        const coarse = cullDistance(cx, cy, cz);
        if (Math.abs(coarse) > reach * 1.6) {
          fillBlock(field, grid, bx, by, bz, Math.sign(coarse) || 1);
          continue;
        }
        for (let z = bz; z < Math.min(bz + block, nz); z += 1) {
          for (let y = by; y < Math.min(by + block, ny); y += 1) {
            for (let x = bx; x < Math.min(bx + block, nx); x += 1) {
              field[x + nx * (y + ny * z)] = distance(
                origin[0] + x * step,
                origin[1] + y * step,
                origin[2] + z * step,
              );
            }
          }
        }
      }
    }
  }
  return field;
}

function fillBlock(field, { nx, ny, nz, block }, bx, by, bz, value) {
  for (let z = bz; z < Math.min(bz + block, nz); z += 1) {
    for (let y = by; y < Math.min(by + block, ny); y += 1) {
      const row = nx * (y + ny * z);
      for (let x = bx; x < Math.min(bx + block, nx); x += 1) field[row + x] = value;
    }
  }
}

export function extractSurface(field, grid) {
  const { nx, ny, nz, origin, step } = grid;
  const at = (x, y, z) => field[x + nx * (y + ny * z)];
  const cellKey = (x, y, z) => x + (nx - 1) * (y + (ny - 1) * z);
  const vertexOf = new Map();
  const positions = [];
  const values = new Float64Array(8);
  for (let z = 0; z < nz - 1; z += 1) {
    for (let y = 0; y < ny - 1; y += 1) {
      for (let x = 0; x < nx - 1; x += 1) {
        let inside = 0;
        for (let corner = 0; corner < 8; corner += 1) {
          const [dx, dy, dz] = CORNERS[corner];
          values[corner] = at(x + dx, y + dy, z + dz);
          if (values[corner] < 0) inside += 1;
        }
        if (inside === 0 || inside === 8) continue;
        let sx = 0;
        let sy = 0;
        let sz = 0;
        let crossings = 0;
        for (const [a, b] of EDGES) {
          const va = values[a];
          const vb = values[b];
          if (va < 0 === vb < 0) continue;
          const t = va / (va - vb);
          sx += CORNERS[a][0] + (CORNERS[b][0] - CORNERS[a][0]) * t;
          sy += CORNERS[a][1] + (CORNERS[b][1] - CORNERS[a][1]) * t;
          sz += CORNERS[a][2] + (CORNERS[b][2] - CORNERS[a][2]) * t;
          crossings += 1;
        }
        vertexOf.set(cellKey(x, y, z), positions.length / 3);
        positions.push(
          origin[0] + (x + sx / crossings) * step,
          origin[1] + (y + sy / crossings) * step,
          origin[2] + (z + sz / crossings) * step,
        );
      }
    }
  }
  const indices = [];
  const quad = (a, b, c, d, flip) => {
    const ids = [a, b, c, d].map((key) => vertexOf.get(key));
    if (ids.some((id) => id === undefined)) return;
    if (flip) indices.push(ids[0], ids[2], ids[1], ids[0], ids[3], ids[2]);
    else indices.push(ids[0], ids[1], ids[2], ids[0], ids[2], ids[3]);
  };
  for (let z = 1; z < nz - 1; z += 1) {
    for (let y = 1; y < ny - 1; y += 1) {
      for (let x = 1; x < nx - 1; x += 1) {
        const here = at(x, y, z) < 0;
        if (here !== at(x + 1, y, z) < 0) {
          quad(cellKey(x, y - 1, z - 1), cellKey(x, y, z - 1), cellKey(x, y, z), cellKey(x, y - 1, z), !here);
        }
        if (here !== at(x, y + 1, z) < 0) {
          quad(cellKey(x - 1, y, z - 1), cellKey(x - 1, y, z), cellKey(x, y, z), cellKey(x, y, z - 1), !here);
        }
        if (here !== at(x, y, z + 1) < 0) {
          quad(cellKey(x - 1, y - 1, z), cellKey(x, y - 1, z), cellKey(x, y, z), cellKey(x - 1, y, z), !here);
        }
      }
    }
  }
  return { positions: new Float32Array(positions), indices: new Uint32Array(indices) };
}

export function gradient(distance, x, y, z, h) {
  const gx = distance(x + h, y, z) - distance(x - h, y, z);
  const gy = distance(x, y + h, z) - distance(x, y - h, z);
  const gz = distance(x, y, z + h) - distance(x, y, z - h);
  const length = Math.hypot(gx, gy, gz) || 1;
  return [gx / length, gy / length, gz / length];
}

export function relaxOntoSurface(positions, distance, iterations, h) {
  for (let i = 0; i < positions.length; i += 3) {
    let x = positions[i];
    let y = positions[i + 1];
    let z = positions[i + 2];
    for (let step = 0; step < iterations; step += 1) {
      const d = distance(x, y, z);
      const [gx, gy, gz] = gradient(distance, x, y, z, h);
      x -= gx * d;
      y -= gy * d;
      z -= gz * d;
    }
    positions[i] = x;
    positions[i + 1] = y;
    positions[i + 2] = z;
  }
}
