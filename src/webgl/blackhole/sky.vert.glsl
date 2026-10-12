attribute float aSize;
attribute float aBrightness;

uniform float uImage;
uniform float uPixelRatio;
uniform float uTime;

varying float vAlpha;

void main() {
  vec3 view = (viewMatrix * vec4(position, 1.0)).xyz;
  vec3 lensCenter = (viewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float behind;
  vec3 lensed = gravitationalLens(view, lensCenter, uImage, behind);
  float image = uImage > 0.0 ? 1.0 : 0.65 * smoothstep(0.0, 6.0, behind);
  float twinkle = 0.75 + 0.25 * sin(uTime * (0.8 + aBrightness * 2.6) + position.x * 0.37);
  vAlpha = aBrightness * image * twinkle;
  gl_Position = projectionMatrix * vec4(lensed, 1.0);
  gl_PointSize = aSize * uPixelRatio;
}
