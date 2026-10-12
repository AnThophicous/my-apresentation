attribute float aOrder;
attribute float aGroup;

uniform float uReveal[4];
uniform float uFocusGroup;

varying float vOrder;
varying float vReveal;
varying float vEmphasis;
varying float vDepth;

void main() {
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  int group = int(aGroup + 0.5);
  vReveal = group == 0 ? uReveal[0] : group == 1 ? uReveal[1] : group == 2 ? uReveal[2] : uReveal[3];
  vOrder = aOrder;
  vEmphasis = abs(aGroup - uFocusGroup) < 0.5 ? 1.0 : 0.0;
  vDepth = -view.z;
  gl_Position = projectionMatrix * view;
}
