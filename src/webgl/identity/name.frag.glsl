varying float vAlpha;

void main() {
  float core = smoothstep(0.5, 0.05, length(gl_PointCoord - 0.5));
  gl_FragColor = vec4(vec3(core * vAlpha * 1.45), 1.0);
}
