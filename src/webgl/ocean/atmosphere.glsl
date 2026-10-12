uniform vec3 uSunDirection;
uniform float uHorizonTone;
uniform float uZenithTone;
uniform float uSunGlow;
uniform float uSunDisc;
uniform float uCloudCover;
uniform float uCloudTone;
uniform vec2 uWind;
uniform float uTime;

float cloudDensity(vec3 direction) {
  float height = max(direction.y, 0.025);
  vec2 plane = direction.xz / height * 0.55 + uWind * uTime * 0.012;
  float base = fbm(plane * 0.9);
  float detail = fbm(plane * 3.1 + vec2(uTime * 0.01, 0.0));
  float shape = smoothstep(0.38, 0.86, base * 0.75 + detail * 0.35);
  return shape * uCloudCover * smoothstep(0.0, 0.12, direction.y);
}

float skyLuminance(vec3 direction) {
  float height = max(direction.y, 0.0);
  float gradient = mix(uHorizonTone, uZenithTone, pow(height, 0.5));
  float sunDot = max(dot(direction, uSunDirection), 0.0);
  float glow = pow(sunDot, 6.0) * 0.22 + pow(sunDot, 48.0) * 0.55;
  float disc = smoothstep(0.9993, 0.99975, sunDot) * uSunDisc;
  float clouds = cloudDensity(direction);
  float cloudLight = uCloudTone * (0.75 + 0.6 * pow(sunDot, 3.0));
  float sky = gradient + glow * uSunGlow;
  sky = mix(sky, cloudLight, clouds);
  return sky + disc * (1.0 - clouds * 0.92);
}

float horizonLuminance(vec3 direction) {
  vec3 level = normalize(vec3(direction.x, 0.0, direction.z));
  return skyLuminance(normalize(level + vec3(0.0, 0.015, 0.0)));
}
