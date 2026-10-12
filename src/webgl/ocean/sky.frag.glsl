uniform mat4 uInverseProjection;
uniform mat4 uCameraWorld;
uniform float uUnderwater;
uniform float uWaterFogTone;

varying vec2 vUv;

void main() {
  vec2 ndc = vUv * 2.0 - 1.0;
  vec4 view = uInverseProjection * vec4(ndc, 1.0, 1.0);
  vec3 direction = normalize((uCameraWorld * vec4(view.xyz / view.w, 0.0)).xyz);
  float tone;
  if (uUnderwater > 0.5) {
    float below = smoothstep(0.0, -0.9, direction.y);
    float above = smoothstep(0.0, 0.9, direction.y);
    tone = uWaterFogTone * (1.0 - below * 0.75 + above * 0.25);
  } else if (direction.y < 0.0) {
    tone = horizonLuminance(direction);
  } else {
    tone = skyLuminance(direction);
  }
  gl_FragColor = vec4(vec3(tone), 1.0);
}
