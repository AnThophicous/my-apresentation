uniform vec4 uWaves[WAVE_COUNT];
uniform float uWaveTime;
uniform float uWaveScale;
uniform float uRingDensity;
uniform vec2 uOrigin;

varying vec3 vWorld;
varying vec3 vNormal;
varying float vJacobian;
varying float vHeight;
varying float vDistance;

const float GRAVITY = 9.81;
const float TAU = 6.28318530718;

void main() {
  vec2 grid = position.xz + uOrigin;
  float distanceFromCenter = length(position.xz);
  vec3 displaced = vec3(grid.x, 0.0, grid.y);
  vec3 tangent = vec3(1.0, 0.0, 0.0);
  vec3 binormal = vec3(0.0, 0.0, 1.0);
  float jxx = 1.0;
  float jzz = 1.0;
  float jxz = 0.0;
  for (int i = 0; i < WAVE_COUNT; i++) {
    vec4 wave = uWaves[i];
    float k = TAU / wave.w;
    float speed = sqrt(GRAVITY / k);
    vec2 direction = normalize(wave.xy);
    float detail = 1.0 - smoothstep(wave.w * uRingDensity * 0.25, wave.w * uRingDensity * 0.5, distanceFromCenter);
    float steepness = wave.z * uWaveScale * detail;
    float amplitude = steepness / k;
    float phase = k * (dot(direction, grid) - speed * uWaveTime);
    float s = sin(phase);
    float c = cos(phase);
    displaced.x += direction.x * amplitude * c;
    displaced.y += amplitude * s;
    displaced.z += direction.y * amplitude * c;
    tangent += vec3(-direction.x * direction.x * steepness * s, direction.x * steepness * c, -direction.x * direction.y * steepness * s);
    binormal += vec3(-direction.x * direction.y * steepness * s, direction.y * steepness * c, -direction.y * direction.y * steepness * s);
    jxx -= direction.x * direction.x * steepness * s;
    jzz -= direction.y * direction.y * steepness * s;
    jxz -= direction.x * direction.y * steepness * s;
  }
  vNormal = normalize(cross(binormal, tangent));
  vJacobian = jxx * jzz - jxz * jxz;
  vHeight = displaced.y;
  vWorld = displaced;
  vDistance = distanceFromCenter;
  gl_Position = projectionMatrix * viewMatrix * vec4(displaced, 1.0);
}
