precision highp float;

uniform sampler2D uScene;
uniform vec2 uResolution;
uniform float uTime;
uniform float uExposure;
uniform float uToneMapping;
uniform float uContrast;
uniform float uGrain;
uniform float uVignette;
uniform float uDither;
uniform float uZoomBlur;
uniform vec2 uZoomCenter;
uniform float uFade;
uniform float uFadeTone;
uniform float uInvert;
uniform float uFlash;
uniform float uWaterline;

varying vec2 vUv;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float bayer2(vec2 a) {
  a = floor(a);
  return fract(dot(a, vec2(0.5, a.y * 0.75)));
}

float bayer8(vec2 a) {
  return bayer2(0.25 * a) * 0.0625 + bayer2(0.5 * a) * 0.25 + bayer2(a);
}

vec3 acesFilm(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

float toSrgb(float value) {
  return value <= 0.0031308 ? value * 12.92 : 1.055 * pow(value, 1.0 / 2.4) - 0.055;
}

vec3 sampleScene(vec2 uv) {
  if (uZoomBlur <= 0.001) return texture2D(uScene, uv).rgb;
  vec3 color = vec3(0.0);
  vec2 direction = (uv - uZoomCenter) * uZoomBlur * 0.08;
  float jitter = hash(gl_FragCoord.xy + uTime);
  for (int i = 0; i < 10; i++) {
    float t = (float(i) + jitter) / 10.0;
    color += texture2D(uScene, uv - direction * t).rgb;
  }
  return color / 10.0;
}

float waterlineShade(vec2 uv, inout vec2 sampleUv) {
  if (uWaterline < -0.5) return 1.0;
  float wobble = sin(uv.x * 23.0 + uTime * 5.0) * 0.012 + sin(uv.x * 61.0 - uTime * 9.0) * 0.004;
  float offset = uv.y - (uWaterline + wobble);
  float submerged = smoothstep(0.004, -0.004, offset);
  sampleUv += vec2(sin(uv.y * 40.0 + uTime * 4.0) * 0.004, 0.0) * submerged;
  float meniscus = exp(-offset * offset / 0.00004);
  return mix(1.0, 0.5, submerged) + meniscus * 0.8;
}

void main() {
  vec2 sampleUv = vUv;
  float waterline = waterlineShade(vUv, sampleUv);
  vec3 hdr = sampleScene(sampleUv) * uExposure * waterline;
  vec3 mapped = mix(clamp(hdr, 0.0, 1.0), acesFilm(hdr), uToneMapping);
  float luminance = dot(mapped, LUMA);
  luminance = toSrgb(clamp(luminance, 0.0, 1.0));
  luminance = clamp((luminance - 0.5) * uContrast + 0.5, 0.0, 1.0);

  vec2 centered = vUv - 0.5;
  centered.x *= uResolution.x / uResolution.y;
  luminance *= 1.0 - uVignette * smoothstep(0.35, 1.25, length(centered));

  if (uDither > 0.001) {
    float levels = mix(24.0, 3.0, uDither);
    float threshold = bayer8(gl_FragCoord.xy) - 0.5;
    float quantized = floor(luminance * levels + 0.5 + threshold) / levels;
    luminance = mix(luminance, quantized, smoothstep(0.0, 0.25, uDither));
  }

  float grain = hash(gl_FragCoord.xy + fract(uTime * 7.31) * 113.0) - 0.5;
  luminance += grain * uGrain * (0.35 + 0.65 * (1.0 - abs(luminance - 0.5) * 2.0));

  luminance = mix(luminance, 1.0 - luminance, uInvert);
  luminance = mix(luminance, uFadeTone, uFade);
  luminance = mix(luminance, 1.0, uFlash);

  gl_FragColor = vec4(vec3(clamp(luminance, 0.0, 1.0)), 1.0);
}
