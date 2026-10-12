export const smoothMin = (a, b, k) => {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};

export const smoothMax = (a, b, k) => -smoothMin(-a, -b, k);

const boundsAround = (minX, minY, minZ, maxX, maxY, maxZ) => [minX, minY, minZ, maxX, maxY, maxZ];

export function sphere([cx, cy, cz], radius) {
  return {
    bounds: boundsAround(cx - radius, cy - radius, cz - radius, cx + radius, cy + radius, cz + radius),
    distance: (x, y, z) => Math.hypot(x - cx, y - cy, z - cz) - radius,
  };
}

export function ellipsoid([cx, cy, cz], [rx, ry, rz]) {
  return {
    bounds: boundsAround(cx - rx, cy - ry, cz - rz, cx + rx, cy + ry, cz + rz),
    distance: (x, y, z) => {
      const px = x - cx;
      const py = y - cy;
      const pz = z - cz;
      const k0 = Math.hypot(px / rx, py / ry, pz / rz);
      const k1 = Math.hypot(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
      return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
    },
  };
}

export function roundCone([ax, ay, az], [bx, by, bz], radiusA, radiusB) {
  const baX = bx - ax;
  const baY = by - ay;
  const baZ = bz - az;
  const l2 = baX * baX + baY * baY + baZ * baZ;
  const rr = radiusA - radiusB;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  const pad = Math.max(radiusA, radiusB);
  return {
    bounds: boundsAround(
      Math.min(ax, bx) - pad,
      Math.min(ay, by) - pad,
      Math.min(az, bz) - pad,
      Math.max(ax, bx) + pad,
      Math.max(ay, by) + pad,
      Math.max(az, bz) + pad,
    ),
    distance: (x, y, z) => {
      const paX = x - ax;
      const paY = y - ay;
      const paZ = z - az;
      const along = paX * baX + paY * baY + paZ * baZ;
      const beyond = along - l2;
      const xvX = paX * l2 - baX * along;
      const xvY = paY * l2 - baY * along;
      const xvZ = paZ * l2 - baZ * along;
      const x2 = xvX * xvX + xvY * xvY + xvZ * xvZ;
      const y2 = along * along * l2;
      const z2 = beyond * beyond * l2;
      const k = Math.sign(rr) * rr * rr * x2;
      if (Math.sign(beyond) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - radiusB;
      if (Math.sign(along) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - radiusA;
      return (Math.sqrt(x2 * a2 * il2) + along * rr) * il2 - radiusA;
    },
  };
}

export const capsule = (a, b, radius) => roundCone(a, b, radius, radius);

export function roundBox([cx, cy, cz], [hx, hy, hz], radius) {
  return {
    bounds: boundsAround(cx - hx, cy - hy, cz - hz, cx + hx, cy + hy, cz + hz),
    distance: (x, y, z) => {
      const qx = Math.abs(x - cx) - hx + radius;
      const qy = Math.abs(y - cy) - hy + radius;
      const qz = Math.abs(z - cz) - hz + radius;
      const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0));
      return outside + Math.min(Math.max(qx, qy, qz), 0) - radius;
    },
  };
}

export function torusY([cx, cy, cz], major, minor) {
  const reach = major + minor;
  return {
    bounds: boundsAround(cx - reach, cy - minor, cz - reach, cx + reach, cy + minor, cz + reach),
    distance: (x, y, z) => Math.hypot(Math.hypot(x - cx, z - cz) - major, y - cy) - minor,
  };
}

export function clipped(shape, [nx, ny, nz], offset, softness) {
  return {
    bounds: shape.bounds,
    distance: (x, y, z) => smoothMax(shape.distance(x, y, z), nx * x + ny * y + nz * z - offset, softness),
  };
}

export function subtracted(shape, cutter, softness) {
  return {
    bounds: shape.bounds,
    distance: (x, y, z) => smoothMax(shape.distance(x, y, z), -cutter.distance(x, y, z), softness),
  };
}

export function blended(shapes, softness) {
  const bounds = shapes.reduce(
    (box, { bounds: next }) => [
      Math.min(box[0], next[0]),
      Math.min(box[1], next[1]),
      Math.min(box[2], next[2]),
      Math.max(box[3], next[3]),
      Math.max(box[4], next[4]),
      Math.max(box[5], next[5]),
    ],
    [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity],
  );
  return {
    bounds,
    distance: (x, y, z) =>
      shapes.reduce((distance, shape) => smoothMin(distance, shape.distance(x, y, z), softness), 1),
  };
}

export function outsideBounds(bounds, x, y, z, margin) {
  return (
    x < bounds[0] - margin ||
    y < bounds[1] - margin ||
    z < bounds[2] - margin ||
    x > bounds[3] + margin ||
    y > bounds[4] + margin ||
    z > bounds[5] + margin
  );
}

const FAR = 1;

export function composeBody(parts, cullMargin) {
  const unions = parts.filter((part) => !part.carve);
  const carvings = parts.filter((part) => part.carve);
  return {
    parts: unions,
    distance(x, y, z) {
      let distance = FAR;
      for (const part of unions) {
        if (outsideBounds(part.shape.bounds, x, y, z, part.blend + cullMargin)) continue;
        distance = smoothMin(distance, part.shape.distance(x, y, z), part.blend);
      }
      for (const part of carvings) {
        if (outsideBounds(part.shape.bounds, x, y, z, part.blend + cullMargin)) continue;
        distance = smoothMax(distance, -part.shape.distance(x, y, z), part.blend);
      }
      return distance;
    },
  };
}
