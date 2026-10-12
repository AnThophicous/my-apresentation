varying float vAlpha;
varying float vFocus;

void main() {
  vec2 point = gl_PointCoord - 0.5;
  float radius = length(point);
  float core = exp(-radius * radius * 260.0) * 1.6;
  float halo = exp(-radius * radius * 26.0) * 0.32;
  float spikeX = exp(-abs(point.y) * 120.0) * exp(-abs(point.x) * 6.0);
  float spikeY = exp(-abs(point.x) * 120.0) * exp(-abs(point.y) * 6.0);
  float spikes = (spikeX + spikeY) * (0.55 + vFocus * 0.6);
  float ring = (1.0 - smoothstep(0.0, 0.018, abs(radius - 0.38))) * vFocus * 0.9;
  float edge = 1.0 - smoothstep(0.42, 0.5, radius);
  gl_FragColor = vec4(vec3((core + halo + spikes) * vAlpha * edge + ring), 1.0);
}
