
export const VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const FRAG = `#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2 uRes;
uniform float uTime;
uniform float uStar;
uniform float uThrow;
uniform float uZoom;
uniform float uReveal;
uniform float uFall;
uniform float uDither;
uniform float uCoreR;
uniform vec2 uMouse;

float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
vec3 hash33(vec3 p3) { p3 = fract(p3 * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }
float hash11(float p) { p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }

float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float a = .5, s = 0.;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; }
  return s;
}

float starLayer(vec2 p, float scale, float density, float seed) {
  p *= scale;
  vec2 c = floor(p), f = fract(p) - .5;
  float h = hash12(c + seed);
  if (h > density) return 0.;
  vec2 o = (hash22(c + seed) - .5) * .6;
  float d = length(f - o);
  float b = hash12(c + seed + 7.1);
  float tw = .6 + .4 * sin(uTime * (.8 + b * 2.5) + h * 60.);
  return (1. - smoothstep(0., .07 + b * .06, d)) * (.2 + .8 * b * b) * tw;
}

float space(vec2 uv) {
  float zoomS = 1. + pow(uZoom, 2.4) * 110.;
  float col = 0.;
  vec2 par = uMouse * .012;

  float zb = 1. + (zoomS - 1.) * .18;
  float field = starLayer(uv / zb + par * .3, 64., .16, 1.) * .75 + starLayer(uv / zb + par * .6, 34., .07, 9.);
  col += field * smoothstep(.12, .85, uThrow);

  float asp = uRes.x / uRes.y;
  for (int i = 0; i < 40; i++) {
    float fi = float(i);
    vec2 h = hash22(vec2(fi * 1.7, 3.7));
    vec2 h2 = hash22(vec2(fi * 2.3, 11.3));
    float depth = .3 + .7 * h2.x;
    vec2 target = vec2((h.x - .5) * asp * .96, (h.y - .5) * .94);
    float tl = length(target);
    if (tl < .14) target *= .14 / max(tl, 1e-3);
    float side = h2.y > .5 ? 1. : -1.;
    vec2 start = vec2(side * (asp * .5 + .2 + h.y * .5), target.y + (h2.x - .5) * .6);
    float t0 = hash11(fi * 1.37 + .3) * .64;
    float t = clamp((uThrow - t0) / (.2 + .16 * h2.x), 0., 1.);
    if (t <= 0.) continue;
    float e = 1. - pow(1. - t, 4.);
    vec2 pos = mix(start, target, e);
    float zs = 1. + (zoomS - 1.) * (.5 + depth);
    vec2 sp = pos * zs + par * depth;
    vec2 dir = normalize(target - start);
    float speed = pow(1. - t, 2.);
    float len = speed * .5 * depth + 1e-4;
    vec2 pa = uv - sp, ba = -dir * len;
    float hs = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.);
    float ds = length(pa - ba * hs);
    float size = (.0014 + .0026 * depth) * min(zs, 8.);
    float tw = .75 + .25 * sin(uTime * (1. + h.x * 3.) + fi);
    float bright = (.45 + .55 * depth) * tw;
    float core = 1. - smoothstep(0., size, ds);
    float halo = size * size * 1.6 / (ds * ds + size * size * 4.);
    col += bright * (core + halo * .5) * (1. - hs * .85);
  }

  vec2 q = uv / zoomS;
  float d = length(q);
  float r = uCoreR;
  float core = 1. - smoothstep(r * .8, r * 1.02, d);
  float glow = r * r * 2.2 / (d * d + r * r * .6);
  float sp1 = exp(-abs(q.y) / (r * .14)) * exp(-abs(q.x) * 5.5);
  float sp2 = exp(-abs(q.x) / (r * .14)) * exp(-abs(q.y) * 5.5);
  vec2 qr = mat2(.7071, -.7071, .7071, .7071) * q;
  float sp3 = exp(-abs(qr.y) / (r * .1)) * exp(-abs(qr.x) * 14.) + exp(-abs(qr.x) / (r * .1)) * exp(-abs(qr.y) * 14.);
  float pulse = .92 + .08 * sin(uTime * 1.7);
  float spikes = (sp1 + sp2 + sp3 * .45) * smoothstep(.25, 1., uStar) * pulse;
  col += uStar * (core + glow * .55 * pulse) + spikes * .9;
  col = mix(col, 1.6, smoothstep(.72, .97, uZoom));
  return col;
}

float starsDir(vec3 d) {
  float s = 0.;
  for (int l = 0; l < 2; l++) {
    float sc = l == 0 ? 60. : 140.;
    vec3 q = d * sc;
    vec3 c = floor(q), f = fract(q) - .5;
    vec3 h = hash33(c + float(l) * 17.);
    if (h.x < (l == 0 ? .9 : .82)) continue;
    float dd = length(f - (h - .5) * .5);
    s += (1. - smoothstep(0., .12, dd)) * (.3 + .7 * h.y);
  }
  float band = exp(-pow(d.y * 3.2 + .5 * (fbm(d.xz * 3.) - .5), 2.) * 9.);
  s += band * (.012 + .05 * pow(fbm(d.xz * 10. + d.y * 3.), 2.));
  return s;
}

vec2 diskShade(vec3 hit, float r, vec3 v) {
  float phi = atan(hit.z, hit.x);
  float omega = 2.4 * pow(r, -1.5);
  float th = phi - uTime * omega * .5;
  vec2 cs = vec2(cos(th), sin(th));
  float n = fbm(vec2(r * 2.6, 0.) + cs * 1.9);
  float n2 = vnoise(vec2(r * 9., 5.) + cs * 5.);
  float dens = smoothstep(2.5, 3.4, r) * (1. - smoothstep(6.5, 12.5, r));
  float temp = pow(3.2 / r, 1.5);
  vec3 vel = normalize(vec3(-hit.z, 0., hit.x));
  float beta = sqrt(.5 / r);
  float cosA = dot(vel, -normalize(v));
  float g = 1. / (1. - beta * cosA);
  float beam = g * g * g;
  float I = dens * temp * (.3 + 1.1 * n * n + .35 * n2) * beam * 1.5;
  float a = clamp(dens * (.45 + .7 * n), 0., 1.);
  return vec2(I, a);
}

float blackhole(vec2 uv) {
  float f = uFall;
  float D = 26. * pow(1. - f, 1.35) + .3;
  if (D < 1.) return 0.;
  float az = .7 + f * 2.6 + uMouse.x * .06;
  float el = mix(.16, .06, f) + uMouse.y * .03;
  vec3 ro = D * vec3(cos(el) * sin(az), sin(el), cos(el) * cos(az));
  vec3 fw = normalize(-ro);
  vec3 rt = normalize(cross(fw, vec3(0., 1., 0.)));
  vec3 up = cross(rt, fw);
  float roll = .18 * sin(f * 2.4);
  vec3 rt2 = rt * cos(roll) + up * sin(roll);
  vec3 up2 = up * cos(roll) - rt * sin(roll);
  float foc = 1.25 + f * .5;
  vec3 v = normalize(fw * foc + rt2 * uv.x + up2 * uv.y);
  vec3 p = ro;
  vec3 hc = cross(p, v);
  float h2 = dot(hc, hc);
  float col = 0., alpha = 0., rmin = 1e3;
  bool captured = false;
  float escape = max(D * 1.4, 30.);
  for (int i = 0; i < 180; i++) {
    float r2 = dot(p, p);
    float r = sqrt(r2);
    rmin = min(rmin, r);
    if (r < 1.) { captured = true; break; }
    if (r > escape && dot(p, v) > 0.) break;
    float dt = clamp(.07 * (r - .5), .015, 1.6);
    vec3 pOld = p;
    v += -1.5 * h2 * p / (r2 * r2 * r) * dt;
    p += v * dt;
    if (pOld.y * p.y < 0.) {
      vec3 hit = mix(pOld, p, pOld.y / (pOld.y - p.y));
      float hr = length(hit.xz);
      if (hr > 2.4 && hr < 13.) {
        vec2 ds = diskShade(hit, hr, v);
        col += (1. - alpha) * ds.x * ds.y;
        alpha += (1. - alpha) * ds.y;
        if (alpha > .985) break;
      }
    }
  }
  if (!captured) {
    float bg = starsDir(normalize(v));
    float ring = exp(-max(rmin - 1.5, 0.) * 26.) * .9;
    col += (1. - alpha) * (bg + ring);
  }
  return col * (1. - smoothstep(.86, .97, f));
}

float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(.5, a.y * .75))); }
float bayer4(vec2 a) { return bayer2(.5 * a) * .25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(.5 * a) * .25 + bayer2(a); }

void main() {
  vec2 uv = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  float col = 0.;
  if (uReveal < 1.) col = space(uv);
  if (uReveal > 0.) {
    float rr = length(uv);
    float iris = uReveal * 1.3;
    float m = 1. - smoothstep(iris - .18, iris, rr);
    if (m > 0.) col = mix(col, blackhole(uv), m);
  }
  float lum = 1. - exp(-max(col, 0.) * 1.9);
  lum += (hash12(gl_FragCoord.xy + fract(uTime) * 91.) - .5) * .05;
  float levels = mix(40., 2., uDither);
  float n = levels - 1.;
  float qv = floor(clamp(lum, 0., 1.) * n + bayer8(gl_FragCoord.xy)) / n;
  outColor = vec4(vec3(clamp(qv, 0., 1.)), 1.);
}`;
