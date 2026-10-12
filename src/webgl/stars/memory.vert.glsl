attribute float aMagnitude;
attribute float aFocus;
attribute float aPhase;

uniform float uTime;
uniform float uPixelRatio;
uniform float uReveal;

varying float vAlpha;
varying float vFocus;

void main() {
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  float depth = -view.z;
  float pulse = 0.85 + 0.15 * sin(uTime * 1.4 + aPhase * 6.2831);
  float near = smoothstep(1.5, 8.0, depth);
  float far = 1.0 - smoothstep(140.0, 230.0, depth);
  vAlpha = (0.55 + aMagnitude * 0.6) * pulse * near * far * uReveal;
  vFocus = aFocus;
  float size = (16.0 + aMagnitude * 18.0) * (1.0 + aFocus * 0.9) * mix(0.45, 1.0, smoothstep(140.0, 30.0, depth));
  gl_Position = projectionMatrix * view;
  gl_PointSize = size * uPixelRatio;
}
