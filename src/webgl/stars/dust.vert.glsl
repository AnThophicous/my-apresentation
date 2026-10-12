attribute float aSize;
attribute float aBrightness;
attribute float aPhase;

uniform float uTime;
uniform float uPixelRatio;
uniform float uScale;
uniform float uReveal;

varying float vAlpha;

void main() {
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  float depth = -view.z;
  float twinkle = 0.7 + 0.3 * sin(uTime * (0.6 + aPhase * 2.4) + aPhase * 40.0);
  float near = smoothstep(0.4, 6.0, depth);
  float far = 1.0 - smoothstep(150.0, 260.0, depth);
  vAlpha = aBrightness * twinkle * near * far * uReveal;
  gl_Position = projectionMatrix * view;
  gl_PointSize = clamp(aSize * uScale / max(depth, 0.5), 1.0, 6.0) * uPixelRatio;
}
