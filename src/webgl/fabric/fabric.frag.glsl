precision highp float;

uniform vec2 uResolution;
uniform float uPixelRatio;
uniform float uTime;
uniform vec2 uCenter;
uniform float uHorizon;
uniform float uTwist;
uniform vec2 uFocus;
uniform float uFocusStrength;
uniform float uFocusRadius;
uniform float uReveal;
uniform float uSpacing;
uniform float uDotRadius;
uniform float uDotTone;

varying vec2 vUv;

vec2 rotate2(vec2 v, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
}

vec2 loupe(vec2 p) {
  vec2 offset = p - uFocus;
  float falloff = exp(-dot(offset, offset) / (uFocusRadius * uFocusRadius));
  return uFocus + offset * (1.0 - uFocusStrength * 0.42 * falloff);
}

vec2 gravity(vec2 p, float radius) {
  if (uHorizon <= 0.0) return p;
  vec2 offset = p - uCenter;
  float closeness = uHorizon / max(radius, uHorizon);
  float pull = closeness * closeness;
  float angle = pull * (uTwist + sin(uTime * 0.7) * 0.12);
  return uCenter + rotate2(offset, angle) * (1.0 + 1.6 * pow(closeness, 1.5));
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uPixelRatio;
  float radius = length(p - uCenter);
  vec2 fabric = gravity(loupe(p), radius);
  vec2 local = (fract(fabric / uSpacing) - 0.5) * uSpacing;
  float footprint = max(length(fwidth(fabric)) * 0.75, 0.5);
  float dotMask = 1.0 - smoothstep(uDotRadius - footprint, uDotRadius + footprint, length(local));
  dotMask *= clamp(2.2 / footprint, 0.0, 1.0);

  float shade = mix(1.0, uDotTone, dotMask * uReveal);
  if (uHorizon > 0.0) {
    float outside = max(radius - uHorizon, 0.0);
    float halo = exp(-outside / (uHorizon * 0.35 + 1.0));
    shade *= 1.0 - 0.16 * halo;
    float ringRadius = uHorizon * 1.5;
    float ring = 1.0 - smoothstep(0.0, 0.9, abs(radius - ringRadius));
    shade = mix(shade, 0.0, ring * smoothstep(3.0, 14.0, uHorizon) * 0.75);
    shade *= smoothstep(uHorizon - 0.75, uHorizon + 0.75, radius);
  }
  gl_FragColor = vec4(vec3(shade), 1.0);
}
