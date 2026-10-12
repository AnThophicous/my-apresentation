uniform sampler2D uScene;
uniform float uExplode;

varying vec2 vUv;
varying vec3 vBary;
varying vec3 vCracks;
varying vec3 vNormal;
varying float vCrack;
varying float vFlight;

void main() {
  vec3 scene = texture2D(uScene, vUv).rgb;
  float edge = min(min(vBary.x, vBary.y), vBary.z);
  float rim = 1.0 - smoothstep(0.0, fwidth(edge) * 1.6, edge);
  vec3 crackBary = mix(vec3(1.0), vBary, step(0.5, vCracks));
  float crackEdge = min(min(crackBary.x, crackBary.y), crackBary.z);
  float crackRim = 1.0 - smoothstep(0.0, fwidth(edge) * 1.3, crackEdge);
  vec3 normal = normalize(vNormal);
  vec3 light = normalize(vec3(0.35, 0.55, 1.0));
  float facing = abs(dot(normal, light));
  float glint = pow(facing, 140.0) * smoothstep(0.0, 0.02, vFlight);
  float sheen = pow(1.0 - abs(normal.z), 3.0) * smoothstep(0.0, 0.02, vFlight);
  float crack = crackRim * vCrack * (1.0 - smoothstep(0.0, 0.03, uExplode));
  float bevel = rim * smoothstep(0.0, 0.015, vFlight) * 0.55;
  vec3 color = scene * (1.0 - sheen * 0.4) + vec3(crack * 1.4 + glint * 1.5 + bevel + sheen * 0.05);
  gl_FragColor = vec4(color, 1.0);
}
