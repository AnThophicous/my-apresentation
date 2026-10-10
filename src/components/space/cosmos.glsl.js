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

const float TAU = 6.2831853;

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

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float spikes(vec2 d, float w, float len) {
  return exp(-abs(d.y) / w) * exp(-abs(d.x) / len) + exp(-abs(d.x) / w) * exp(-abs(d.y) / len);
}

float starLayer(vec2 p, float scale, float density, float seed) {
  p *= scale;
  vec2 c = floor(p), f = fract(p) - .5;
  float h = hash12(c + seed);
  if (h > density) return 0.;
  vec2 o = (hash22(c + seed) - .5) * .6;
  vec2 d = f - o;
  float b = hash12(c + seed + 7.1);
  float tw = .6 + .4 * sin(uTime * (.8 + b * 2.5) + h * 60.);
  float star = (1. - smoothstep(0., .07 + b * .06, length(d))) * (.2 + .8 * b * b);
  float flare = b > .93 ? spikes(d, .012, .16) * .5 : 0.;
  return (star + flare) * tw;
}

float nebula(vec2 p) {
  float n = fbm(p * 1.3 + vec2(uTime * .006, 0.));
  float m = fbm(p * 2.7 - vec2(0., uTime * .004) + n * 1.6);
  return pow(clamp(m * 1.25 - .35, 0., 1.), 2.2);
}

float hyperspace(vec2 uv) {
  float dive = smoothstep(.06, .4, uZoom) * (1. - smoothstep(.8, .96, uZoom));
  if (dive <= 0.) return 0.;
  float cell = (atan(uv.y, uv.x) / TAU + .5) * 140.;
  float hs = hash11(floor(cell) * 1.31);
  if (hs < .7) return 0.;
  float lane = 1. - smoothstep(0., .1, abs(fract(cell) - .5));
  float rr = length(uv);
  float dash = fract(rr * (1.2 + hs * 2.) - uTime * (1. + hs * 1.6) - uZoom * 7.);
  float seg = smoothstep(0., .04, dash) * (1. - smoothstep(.2 + hs * .3, .6, dash));
  return lane * seg * smoothstep(.04, .7, rr) * dive * 1.5;
}

float thrownStars(vec2 uv, float zoomS, vec2 par) {
  float asp = uRes.x / uRes.y;
  float col = 0.;
  for (int i = 0; i < 56; i++) {
    float fi = float(i);
    vec2 h = hash22(vec2(fi * 1.7, 3.7));
    vec2 h2 = hash22(vec2(fi * 2.3, 11.3));
    float depth = .3 + .7 * h2.x;
    vec2 target = vec2((h.x - .5) * asp * .96, (h.y - .5) * .94);
    float tl = length(target);
    if (tl < .14) target *= .14 / max(tl, 1e-3);
    float side = h2.y > .5 ? 1. : -1.;
    vec2 start = vec2(side * (asp * .5 + .2 + h.y * .5), target.y + (h2.x - .5) * .6);
    float t0 = hash11(fi * 1.37 + .3) * .66;
    float t = clamp((uThrow - t0) / (.2 + .16 * h2.x), 0., 1.);
    if (t <= 0.) continue;
    float e = 1. - pow(1. - t, 4.);
    vec2 pos = mix(start, target, e);
    float zs = 1. + (zoomS - 1.) * (.5 + depth);
    vec2 sp = pos * zs + par * depth;
    vec2 dir = normalize(target - start);
    float speed = pow(1. - t, 2.);
    float len = speed * .55 * depth + 1e-4;
    vec2 pa = uv - sp, ba = -dir * len;
    float hs = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.);
    float ds = length(pa - ba * hs);
    float size = (.0013 + .0026 * depth) * min(zs, 8.);
    float tw = .75 + .25 * sin(uTime * (1. + h.x * 3.) + fi);
    float bright = (.45 + .55 * depth) * tw;
    float core = 1. - smoothstep(0., size, ds);
    float halo = size * size * 1.6 / (ds * ds + size * size * 4.);
    float flare = depth > .82 ? spikes(uv - sp, size * .22, size * 9.) * .4 * e : 0.;
    col += bright * ((core + halo * .5) * (1. - hs * .85) + flare);
  }
  return col;
}

float firstStar(vec2 uv, float zoomS) {
  vec2 q = uv / zoomS;
  float d = length(q);
  float r = uCoreR;
  float pulse = .92 + .08 * sin(uTime * 1.7);
  float core = 1. - smoothstep(r * .8, r * 1.02, d);
  float glow = r * r * 2.2 / (d * d + r * r * .6);
  vec2 qs = rot(uTime * .03) * q;
  vec2 qd = rot(.7854) * qs;
  float spk = spikes(qs, r * .14, 1. / 5.5) + spikes(qd, r * .1, 1. / 14.) * .45;
  vec2 dirv = d > 0. ? q / d : vec2(0.);
  float rays = pow(fbm(dirv * 5. + vec2(uTime * .08, -uTime * .05)), 3.) * 2.2;
  float corona = rays * exp(-d / (r * 4.5)) * smoothstep(r * .9, r * 1.8, d);
  float ring = exp(-pow((d - r * 7.5) / (r * .45), 2.)) * .04 + exp(-pow((d - r * 13.) / (r * .3), 2.)) * .02;
  float s = uStar * (core + glow * .55 * pulse + corona * .4 + ring);
  return s + spk * smoothstep(.25, 1., uStar) * pulse * .9;
}

float space(vec2 uv) {
  float zoomS = 1. + pow(uZoom, 2.4) * 110.;
  vec2 par = uMouse * .012;
  float reveal = smoothstep(.12, .85, uThrow);
  vec2 bq = uv / (1. + (zoomS - 1.) * .18);
  float col = nebula(bq * 1.4 + par * .2) * .17 * reveal;
  col += (starLayer(bq + par * .2, 110., .22, 3.) * .45 + starLayer(bq + par * .35, 64., .16, 1.) * .75 + starLayer(bq + par * .6, 34., .07, 9.)) * reveal;
  col += hyperspace(uv);
  col += thrownStars(uv, zoomS, par);
  col += firstStar(uv, zoomS);
  return mix(col, 1.6, smoothstep(.72, .97, uZoom));
}

float starsDir(vec3 d) {
  float s = 0.;
  for (int l = 0; l < 3; l++) {
    float sc = l == 0 ? 50. : l == 1 ? 110. : 220.;
    vec3 q = d * sc;
    vec3 c = floor(q), f = fract(q) - .5;
    vec3 h = hash33(c + float(l) * 17.);
    if (h.x < (l == 0 ? .9 : l == 1 ? .82 : .78)) continue;
    float dd = length(f - (h - .5) * .5);
    s += (1. - smoothstep(0., .12, dd)) * (.3 + .7 * h.y) * (l == 2 ? .5 : 1.);
  }
  float band = exp(-pow(d.y * 3.2 + .5 * (fbm(d.xz * 3.) - .5), 2.) * 9.);
  s += band * (.012 + .06 * pow(fbm(d.xz * 10. + d.y * 3.), 2.));
  s += pow(fbm(d.xy * 2.2 + d.z * 1.7), 4.) * .05;
  return s;
}

vec2 diskShade(vec3 hit, float r, vec3 v) {
  float phi = atan(hit.z, hit.x);
  float omega = 2.4 * pow(r, -1.5);
  float th = phi - uTime * omega * 1.1;
  vec2 cs = vec2(cos(th), sin(th));
  float n = fbm(vec2(r * 2.6, 0.) + cs * 1.9);
  float streak = fbm(vec2(r * 14., 3.) + cs * 1.2);
  float spiral = .5 + .5 * sin(th * 2. + log(r) * 9.);
  float hot = pow(vnoise(vec2(r * 4., 7.) + cs * 3.), 6.) * 3.;
  float dens = smoothstep(2.45, 3.1, r) * (1. - smoothstep(6.5, 12.5, r));
  float rim = exp(-pow((r - 2.75) * 5., 2.));
  float temp = pow(3.2 / r, 1.6);
  vec3 vel = normalize(vec3(-hit.z, 0., hit.x));
  float beta = sqrt(.5 / r);
  float g = 1. / (1. - beta * dot(vel, -normalize(v)));
  float beam = g * g * g;
  float grav = sqrt(max(1. - 1. / r, 0.));
  float I = dens * temp * (.25 + .9 * n * n + .55 * streak * streak + .35 * spiral * n + hot) * beam * grav * 1.7 + rim * beam;
  float a = clamp(dens * (.4 + .7 * n) + rim * .5, 0., 1.);
  return vec2(I, a);
}

float blackhole(vec2 uv) {
  float f = uFall;
  float D = 26. * pow(1. - f, 1.35) + .3;
  if (D < 1.) return 0.;
  float az = .7 + f * 2.6 + uTime * .025 + uMouse.x * .06;
  float el = mix(.16, .06, f) + sin(uTime * .21) * .015 + uMouse.y * .03;
  vec3 ro = D * vec3(cos(el) * sin(az), sin(el), cos(el) * cos(az));
  vec3 fw = normalize(-ro);
  vec3 rt = normalize(cross(fw, vec3(0., 1., 0.)));
  vec3 up = cross(rt, fw);
  float roll = .18 * sin(f * 2.4);
  vec3 rt2 = rt * cos(roll) + up * sin(roll);
  vec3 up2 = up * cos(roll) - rt * sin(roll);
  vec3 v = normalize(fw * (1.25 + f * .5) + rt2 * uv.x + up2 * uv.y);
  vec3 p = ro;
  vec3 hc = cross(p, v);
  float h2 = dot(hc, hc);
  float col = 0., alpha = 0., rmin = 1e3;
  bool captured = false;
  float escape = max(D * 1.4, 30.);
  for (int i = 0; i < 200; i++) {
    float r2 = dot(p, p);
    float r = sqrt(r2);
    rmin = min(rmin, r);
    if (r < 1.) { captured = true; break; }
    if (r > escape && dot(p, v) > 0.) break;
    float dt = clamp(.07 * (r - .5), .015, 1.6);
    vec3 pOld = p;
    v += -1.5 * h2 * p / (r2 * r2 * r) * dt;
    p += v * dt;

    float ry = abs(p.y);
    float rxz = length(p.xz);
    if (ry < .7 && rxz > 2.3 && rxz < 12.) {
      float haze = exp(-ry * ry * 28.) * smoothstep(2.4, 3.6, rxz) * (1. - smoothstep(7., 12., rxz)) * pow(3.2 / rxz, 1.2);
      col += (1. - alpha) * haze * dt * .07;
    }
    if (rxz < 1.8 && ry > 1.1 && ry < 22.) {
      float w = .1 + ry * .065;
      float jet = exp(-rxz * rxz / (w * w)) * smoothstep(1.1, 3., ry) * (1. - smoothstep(9., 22., ry));
      jet *= .35 + .65 * vnoise(vec2(ry * 1.4 - uTime * 3.2, 0.) + normalize(p.xz + 1e-4) * 1.4);
      col += (1. - alpha) * jet * dt * .16;
    }

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
    float edge = max(rmin - 1.5, 0.);
    float ring = exp(-edge * 40.) * 1.1 + exp(-edge * 9.) * .14;
    col += (1. - alpha) * (starsDir(normalize(v)) + ring);
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
    float m = 1. - smoothstep(uReveal * 1.3 - .18, uReveal * 1.3, length(uv));
    if (m > 0.) col = mix(col, blackhole(uv), m);
  }
  float lum = 1. - exp(-max(col, 0.) * 1.9);
  lum += (hash12(gl_FragCoord.xy + fract(uTime) * 91.) - .5) * .045;
  float n = mix(40., 2., uDither) - 1.;
  float qv = floor(clamp(lum, 0., 1.) * n + bayer8(gl_FragCoord.xy)) / n;
  outColor = vec4(vec3(clamp(qv, 0., 1.)), 1.);
}`;
