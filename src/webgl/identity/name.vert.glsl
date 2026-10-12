attribute vec3 aStart;
attribute vec4 aSeed;

uniform float uForm;
uniform float uTime;
uniform float uPixelRatio;
uniform float uSize;
uniform vec3 uPointer;
uniform float uPointerStrength;
uniform float uPointerRadius;
uniform float uScatter;

varying float vAlpha;

vec3 swirl(vec3 p, float t) {
  return vec3(
    sin(p.y * 0.9 + t * 0.7 + aSeed.x * 6.2831),
    cos(p.x * 0.8 - t * 0.6 + aSeed.y * 6.2831),
    sin(p.x * 0.5 + p.y * 0.5 + t * 0.5 + aSeed.z * 6.2831)
  );
}

void main() {
  float delay = aSeed.w * 0.45;
  float form = clamp((uForm - delay) / 0.55, 0.0, 1.0);
  form = form * form * (3.0 - 2.0 * form);
  vec3 settled = position + swirl(position * 3.0, uTime) * 0.012;
  vec3 drifting = aStart + swirl(aStart * 0.25, uTime * 0.6) * 0.8;
  vec3 world = mix(drifting, settled, form);
  world += swirl(position * 0.6, uTime * 0.8) * uScatter * (0.6 + aSeed.x);
  world.y += uScatter * uScatter * (2.0 + aSeed.y * 5.0);
  vec2 away = world.xy - uPointer.xy;
  float distanceToPointer = length(away);
  float push = pow(max(1.0 - distanceToPointer / uPointerRadius, 0.0), 2.0) * uPointerStrength * form;
  world.xy += away / max(distanceToPointer, 0.0001) * push * 0.9;
  world.z += push * 1.4;
  vec4 view = modelViewMatrix * vec4(world, 1.0);
  float twinkle = 0.75 + 0.25 * sin(uTime * (1.2 + aSeed.z * 2.4) + aSeed.x * 40.0);
  vAlpha = mix(0.35, 1.0, form) * twinkle * (1.0 - uScatter * 0.8) * (1.0 + push * 1.5);
  gl_Position = projectionMatrix * view;
  gl_PointSize = uSize * (0.7 + aSeed.y * 0.6) * uPixelRatio * (14.0 / max(-view.z, 1.0));
}
