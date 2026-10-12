varying float vAlpha;

void main() {
  float distanceToCenter = length(gl_PointCoord - 0.5);
  float core = smoothstep(0.5, 0.0, distanceToCenter);
  gl_FragColor = vec4(vec3(core * core * vAlpha), 1.0);
}
