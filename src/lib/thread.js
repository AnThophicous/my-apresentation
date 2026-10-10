import { clamp, lerp, smoothstep } from './math';

const n1 = (t) => 0.5 + 0.25 * Math.sin(t * 1.7) + 0.25 * Math.sin(t * 3.1 + 1.3);

export function buildThread({ W, H, xc, y0, yUntangled, yCenterStart, yCenterEnd, yEnd, mobile }) {
  const step = 2.5;
  const Rmax = mobile ? 13 : 44;
  const xs = [];
  const ys = [];
  const base = [];
  const cum = [];
  let theta = 0;
  let total = 0;
  let px = W / 2;
  let py = y0;
  for (let y = y0; y <= yEnd + 0.01; y += step) {
    let bx;
    if (y < yCenterStart) bx = lerp(W / 2, xc, smoothstep(y0, y0 + H * 1.2, y));
    else bx = lerp(xc, W / 2, smoothstep(yCenterStart, yCenterEnd, y));
    const life = clamp((y - y0) / (yUntangled - y0));
    const A = smoothstep(y0, y0 + H * 0.35, y) * Math.pow(1 - life, 1.25);
    if (!mobile) bx += Math.sin(y * 0.0019) * W * 0.018 * A;
    const period = lerp(58, 260, life);
    theta += ((Math.PI * 2) / period) * step * (0.7 + 0.6 * n1(y * 0.004));
    const R = A * Rmax * (0.6 + 0.8 * n1(y * 0.0023 + 3));
    const x = bx + R * Math.sin(theta);
    const yy = y - R * Math.cos(theta) + R;
    total += Math.hypot(x - px, yy - py);
    xs.push(x);
    ys.push(yy);
    base.push(y);
    cum.push(total);
    px = x;
    py = yy;
  }
  let d = '';
  for (let i = 0; i < xs.length; i++) d += `${i ? 'L' : 'M'}${xs[i].toFixed(1)} ${ys[i].toFixed(1)}`;
  return { xs, ys, base, cum, total, d };
}

export function threadAt(t, y) {
  const { base, xs, ys, cum } = t;
  if (!base.length) return { x: 0, y, len: 0 };
  if (y <= base[0]) return { x: xs[0], y: ys[0], len: 0 };
  const last = base.length - 1;
  if (y >= base[last]) return { x: xs[last], y: ys[last], len: cum[last] };
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (base[m] <= y) lo = m;
    else hi = m;
  }
  const k = (y - base[lo]) / (base[hi] - base[lo]);
  return { x: lerp(xs[lo], xs[hi], k), y: lerp(ys[lo], ys[hi], k), len: lerp(cum[lo], cum[hi], k) };
}

export function buildYarn(count = 720, seed = 4) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const pts = [];
  let p = [0, 0, 1];
  let t = [1, 0, 0];
  let turn = 0;
  for (let i = 0; i < count; i++) {
    pts.push(p.slice());
    turn = turn * 0.9 + (rnd() - 0.5) * 0.5;
    const c = Math.cos(turn);
    const sn = Math.sin(turn);
    const b = [p[1] * t[2] - p[2] * t[1], p[2] * t[0] - p[0] * t[2], p[0] * t[1] - p[1] * t[0]];
    t = [t[0] * c + b[0] * sn, t[1] * c + b[1] * sn, t[2] * c + b[2] * sn];
    const ds = 0.16;
    p = [p[0] + t[0] * ds, p[1] + t[1] * ds, p[2] + t[2] * ds];
    const l = Math.hypot(p[0], p[1], p[2]);
    p = [p[0] / l, p[1] / l, p[2] / l];
    const dot = t[0] * p[0] + t[1] * p[1] + t[2] * p[2];
    t = [t[0] - dot * p[0], t[1] - dot * p[1], t[2] - dot * p[2]];
    const tl = Math.hypot(t[0], t[1], t[2]);
    t = [t[0] / tl, t[1] / tl, t[2] / tl];
  }
  return pts;
}

export function projectYarn(pts, cx, cy, r, ax, ay) {
  const ca = Math.cos(ax);
  const sa = Math.sin(ax);
  const cb = Math.cos(ay);
  const sb = Math.sin(ay);
  let d = '';
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0, z0] = pts[i];
    const x1 = x0 * cb + z0 * sb;
    const z1 = -x0 * sb + z0 * cb;
    const y2 = y0 * ca - z1 * sa;
    d += `${i ? 'L' : 'M'}${(cx + x1 * r).toFixed(1)} ${(cy + y2 * r).toFixed(1)}`;
  }
  return d;
}
