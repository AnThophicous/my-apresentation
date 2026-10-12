uniform float uRadius;

varying float vAlpha;

void main() {
  vec3 lensCenter = (viewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vAlpha = 0.65 + 0.35 * sin(atan(position.y, position.x) * 3.0);
  gl_Position = projectionMatrix * vec4(lensCenter + vec3(position.xy * uRadius, 0.0), 1.0);
}
