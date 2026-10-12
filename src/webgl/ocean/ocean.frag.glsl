uniform float uDeepTone;
uniform float uScatterTone;
uniform float uFoamAmount;
uniform float uCloudShadow;
uniform float uHazeDensity;
uniform float uSunIntensity;
uniform float uUnderwater;
uniform float uWaterFogTone;
uniform float uWaterFogDensity;
uniform float uDetailScale;

varying vec3 vWorld;
varying vec3 vNormal;
varying float vJacobian;
varying float vHeight;
varying float vDistance;

const float WATER_IOR = 1.333;

vec2 rippleSlope(vec2 p, float time, float viewDistance) {
  vec2 slope = vec2(0.0);
  vec2 directions[6];
  directions[0] = vec2(0.94, 0.34);
  directions[1] = vec2(-0.62, 0.78);
  directions[2] = vec2(0.17, -0.98);
  directions[3] = vec2(-0.91, -0.41);
  directions[4] = vec2(0.55, 0.83);
  directions[5] = vec2(-0.25, 0.97);
  float wavelength = 3.4;
  float amplitude = 0.03;
  for (int i = 0; i < 6; i++) {
    float k = 6.2831853 / wavelength;
    float phase = k * dot(directions[i], p) - time * sqrt(9.81 * k);
    float fade = 1.0 - smoothstep(wavelength * 18.0, wavelength * 40.0, viewDistance);
    slope += directions[i] * amplitude * k * cos(phase) * fade;
    wavelength *= 0.63;
    amplitude *= 0.62;
  }
  return slope;
}

float cloudShadowAt(vec2 position) {
  vec2 uv = position * 0.0032 + uWind * uTime * 0.0045;
  return smoothstep(0.42, 0.72, fbm(uv)) * uCloudShadow;
}

float foamMask(vec2 position, float jacobian) {
  float crest = smoothstep(0.78, 0.3, jacobian);
  float streaks = fbm(position * vec2(0.9, 2.2) + vec2(uTime * 0.12, 0.0));
  return crest * smoothstep(0.35, 0.75, streaks) * uFoamAmount;
}

float shadeFromAbove(vec3 normal, vec3 toCamera) {
  float facing = max(dot(normal, toCamera), 0.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
  vec3 reflected = reflect(-toCamera, normal);
  reflected.y = abs(reflected.y);
  float sky = skyLuminance(normalize(reflected));
  float shadow = cloudShadowAt(vWorld.xz);
  float light = 1.0 - shadow * 0.62;
  float sunDot = max(dot(normalize(reflected), uSunDirection), 0.0);
  float glint = (pow(sunDot, 1400.0) * 30.0 + pow(sunDot, 90.0) * 0.9) * uSunIntensity * (1.0 - shadow * 0.9);
  float back = pow(clamp(dot(toCamera, -uSunDirection) * 0.5 + 0.5, 0.0, 1.0), 3.0);
  float scatter = uScatterTone * max(vHeight + 0.6, 0.0) * (0.35 + back) * light;
  float body = uDeepTone * light + scatter;
  float lit = mix(body, sky * (0.55 + 0.45 * light), fresnel) + glint;
  float foam = foamMask(vWorld.xz, vJacobian);
  lit = mix(lit, (0.5 + 0.25 * light) * uCloudTone, foam);
  float haze = 1.0 - exp(-vDistance * uHazeDensity);
  return mix(lit, horizonLuminance(-toCamera), haze);
}

float shadeFromBelow(vec3 normal, vec3 toCamera) {
  vec3 incident = -toCamera;
  vec3 downNormal = -normal;
  float cosIncidence = clamp(dot(-incident, downNormal), 0.0, 1.0);
  float sinIncidence = sqrt(1.0 - cosIncidence * cosIncidence);
  float window = smoothstep(0.78, 0.7, sinIncidence);
  vec3 transmitted = refract(incident, downNormal, WATER_IOR);
  vec3 skyward = dot(transmitted, transmitted) < 0.001 ? vec3(0.0, 1.0, 0.0) : normalize(transmitted);
  float sunDot = max(dot(skyward, uSunDirection), 0.0);
  float sky = skyLuminance(skyward) * 1.6 + pow(sunDot, 90.0) * 5.0 * uSunIntensity;
  float reflectedDeep = uWaterFogTone * 0.55;
  float lit = mix(reflectedDeep, sky, window);
  float fog = 1.0 - exp(-length(vWorld - cameraPosition) * uWaterFogDensity);
  return mix(lit, uWaterFogTone, fog);
}

void main() {
  float viewDistance = length(cameraPosition - vWorld);
  vec2 slope = rippleSlope(vWorld.xz, uTime, viewDistance) * uDetailScale;
  vec3 normal = normalize(normalize(vNormal) + vec3(-slope.x, 0.0, -slope.y));
  vec3 toCamera = normalize(cameraPosition - vWorld);
  float tone = uUnderwater > 0.5 ? shadeFromBelow(normal, toCamera) : shadeFromAbove(normal, toCamera);
  gl_FragColor = vec4(vec3(tone), 1.0);
}
