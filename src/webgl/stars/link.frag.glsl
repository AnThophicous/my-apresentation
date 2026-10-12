uniform float uOpacity;

varying float vOrder;
varying float vReveal;
varying float vEmphasis;
varying float vDepth;

void main() {
  float drawn = 1.0 - smoothstep(vReveal - 0.02, vReveal, vOrder);
  float near = smoothstep(1.0, 6.0, vDepth) * (1.0 - smoothstep(120.0, 200.0, vDepth));
  gl_FragColor = vec4(vec3(drawn * near * uOpacity * (0.55 + vEmphasis * 0.45)), 1.0);
}
