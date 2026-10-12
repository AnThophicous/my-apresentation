uniform float uLensStrength;

vec3 gravitationalLens(vec3 source, vec3 lensCenter, float image, out float behind) {
  float lensDistance = length(lensCenter);
  vec3 lensDirection = lensCenter / lensDistance;
  float sourceDistance = length(source);
  vec3 sourceDirection = source / sourceDistance;
  behind = dot(source - lensCenter, lensDirection);
  float cosBeta = dot(sourceDirection, lensDirection);
  vec3 side = sourceDirection - lensDirection * cosBeta;
  float sideLength = length(side);
  float beta = atan(sideLength, cosBeta);
  vec3 offAxis = sideLength > 1e-6 ? side / sideLength : vec3(0.0, 1.0, 0.0);
  float einstein = 2.0 * uLensStrength * max(behind, 0.0) / (lensDistance * sourceDistance);
  float theta = 0.5 * (beta + image * sqrt(beta * beta + 4.0 * einstein));
  return (lensDirection * cos(theta) + offAxis * sin(theta)) * sourceDistance;
}
