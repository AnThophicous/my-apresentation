attribute vec3 aCentroid;
attribute vec3 aBary;
attribute vec3 aCracks;
attribute vec4 aSeed;
attribute float aDistance;

uniform float uExplode;
uniform float uCrack;
uniform vec2 uImpact;
uniform float uScale;

varying vec2 vUv;
varying vec3 vBary;
varying vec3 vCracks;
varying vec3 vNormal;
varying float vCrack;
varying float vFlight;

vec3 rotateAround(vec3 v, vec3 axis, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return v * c + cross(axis, v) * s + axis * dot(axis, v) * (1.0 - c);
}

void main() {
  float delay = aDistance * 0.22;
  float flight = max(uExplode - delay, 0.0);
  vec3 axis = normalize(aSeed.xyz * 2.0 - 1.0 + vec3(0.0, 0.0, 0.001));
  float angle = flight * (1.5 + aSeed.w * 7.0);
  vec3 local = rotateAround(position - aCentroid, axis, angle);
  vec2 away = aCentroid.xy - uImpact;
  vec2 outward = away / max(length(away), 0.001);
  float burst = (0.35 + aSeed.x * 1.1) * (1.25 - aDistance);
  vec3 velocity = vec3(outward * burst, 0.9 + aSeed.y * 2.6) * uScale;
  vec3 center = aCentroid + velocity * flight + vec3(0.0, -flight * flight * 0.35 * uScale, 0.0);
  vUv = uv;
  vBary = aBary;
  vCracks = aCracks;
  vNormal = normalize(normalMatrix * rotateAround(vec3(0.0, 0.0, 1.0), axis, angle));
  float crackKind = max(max(aCracks.x, aCracks.y), aCracks.z);
  float crackReach = crackKind > 1.5 ? uCrack : uCrack * 0.68;
  vCrack = 1.0 - smoothstep(crackReach - 0.06, crackReach, aDistance);
  vFlight = flight;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(center + local, 1.0);
}
