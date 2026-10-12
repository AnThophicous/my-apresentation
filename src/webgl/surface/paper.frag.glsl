precision highp float;

uniform vec2 uResolution;
uniform float uPixelRatio;
uniform float uLineY;
uniform float uLineWidth;
uniform sampler2D uWave;
uniform float uReveal;
uniform vec2 uOrigin;
uniform float uTime;
uniform float uInk;
uniform vec4 uRipples[4];

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amplitude * noise(p);
    p = p * 2.03 + vec2(11.7, 3.1);
    amplitude *= 0.5;
  }
  return sum;
}

float rippleShade(vec2 p) {
  float shade = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 ripple = uRipples[i];
    if (ripple.w <= 0.0) continue;
    float radius = ripple.z * 260.0 * uPixelRatio;
    float ring = (length(p - ripple.xy) - radius) / (7.0 * uPixelRatio);
    shade += sin(ring * 1.6) * exp(-ring * ring * 0.08) * ripple.w * exp(-ripple.z * 1.7);
  }
  return shade;
}

void main() {
  vec2 p = gl_FragCoord.xy;
  float wave = texture2D(uWave, vec2(p.x / uResolution.x, 0.5)).r * uPixelRatio;
  float lineY = uLineY + wave;
  float distanceToLine = p.y - lineY;
  float halfWidth = uLineWidth * 0.5;
  float line = 1.0 - smoothstep(halfWidth - 0.5, halfWidth + 0.75, abs(distanceToLine));

  vec2 relative = (p - uOrigin) / uResolution.y;
  relative.y *= distanceToLine < 0.0 ? 0.55 : 1.45;
  float edge = fbm(relative * 5.0 + vec2(uTime * 0.15, -uTime * 0.1)) * 0.18;
  float radius = uReveal * 2.4;
  float front = length(relative) + edge - radius;
  float covered = smoothstep(-0.015, 0.015, front);
  float fringe = exp(-max(front, 0.0) * 22.0) * step(0.0, front) * smoothstep(0.0, 0.05, uReveal);

  float paper = 1.0 - rippleShade(p) * 0.045;
  paper *= 1.0 - fringe * 0.55;
  paper = mix(paper, 0.0, uInk);
  float tone = mix(paper, 0.0, line);
  gl_FragColor = vec4(vec3(tone), covered);
}
