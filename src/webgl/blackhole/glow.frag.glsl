uniform float uIntensity;
uniform float uGain;

varying float vAlpha;

void main() {
  gl_FragColor = vec4(vec3(vAlpha * uIntensity * uGain), 1.0);
}
