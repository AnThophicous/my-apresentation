attribute float aRadius;
attribute float aAngle;
attribute float aSeed;

uniform float uTime;
uniform float uImage;
uniform float uSpin;
uniform float uInner;
uniform float uOuter;

varying float vAlpha;

void main() {
  float angle = aAngle + uTime * uSpin * pow(aRadius, -1.5);
  vec3 world = vec3(cos(angle) * aRadius, 0.0, sin(angle) * aRadius);
  vec3 view = (viewMatrix * vec4(world, 1.0)).xyz;
  vec3 lensCenter = (viewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float behind;
  vec3 lensed = gravitationalLens(view, lensCenter, uImage, behind);

  vec3 tangent = vec3(-sin(angle), 0.0, cos(angle));
  vec3 toCamera = normalize(cameraPosition - world);
  float speed = 0.5 * sqrt(uInner / aRadius);
  float beaming = pow(1.0 / max(0.2, 1.0 - speed * dot(tangent, toCamera)), 3.0);

  float swirl = sin(angle * 2.0 - log(aRadius) * 6.5 + aSeed * 6.2831);
  float dash = smoothstep(0.08, 0.3, fract(angle * (2.0 + floor(aSeed * 6.0)) * 0.15915 + aSeed * 3.7));
  float pattern = (0.5 + 0.5 * swirl) * mix(1.0, dash, 0.6);
  float inner = smoothstep(uInner - 0.05, uInner + 0.4, aRadius);
  float outer = smoothstep(uOuter, uOuter * 0.6, aRadius);
  float profile = inner * outer * pow(uInner / aRadius, 1.1);
  float image = uImage > 0.0 ? 1.0 : 0.55 * smoothstep(0.0, 2.5, behind);
  vAlpha = beaming * pattern * profile * image;
  gl_Position = projectionMatrix * vec4(lensed, 1.0);
}
