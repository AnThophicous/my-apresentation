import * as THREE from 'three';

const pivot = new THREE.Vector3();
const fromDirection = new THREE.Vector3();
const toDirection = new THREE.Vector3();
const delta = new THREE.Quaternion();
const worldRotation = new THREE.Quaternion();
const parentRotation = new THREE.Quaternion();
const targetLocal = new THREE.Quaternion();
const identity = new THREE.Quaternion();
const composed = new THREE.Quaternion();
const limited = new THREE.Quaternion();
const forward = new THREE.Vector3();
const desired = new THREE.Vector3();
const start = new THREE.Vector3();
const middle = new THREE.Vector3();
const end = new THREE.Vector3();
const axis = new THREE.Vector3();
const poleDirection = new THREE.Vector3();
const elbow = new THREE.Vector3();

function applyWorldRotation(bone: THREE.Object3D, rotation: THREE.Quaternion, weight: number): void {
  if (!bone.parent) return;
  bone.getWorldQuaternion(worldRotation);
  bone.parent.getWorldQuaternion(parentRotation);
  composed.copy(rotation).multiply(worldRotation);
  targetLocal.copy(parentRotation.invert()).multiply(composed);
  bone.quaternion.slerp(targetLocal, weight);
  bone.updateMatrixWorld(true);
}

export function swingBone(
  bone: THREE.Object3D,
  from: THREE.Vector3,
  to: THREE.Vector3,
  weight: number,
): void {
  bone.getWorldPosition(pivot);
  fromDirection.copy(from).sub(pivot).normalize();
  toDirection.copy(to).sub(pivot).normalize();
  delta.setFromUnitVectors(fromDirection, toDirection);
  applyWorldRotation(bone, delta, weight);
}

export function solveTwoBoneIK(
  upper: THREE.Object3D,
  lower: THREE.Object3D,
  effector: THREE.Object3D,
  target: THREE.Vector3,
  pole: THREE.Vector3,
  weight: number,
): void {
  if (weight <= 0.001) return;
  upper.getWorldPosition(start);
  lower.getWorldPosition(middle);
  effector.getWorldPosition(end);
  const upperLength = start.distanceTo(middle);
  const lowerLength = middle.distanceTo(end);
  axis.copy(target).sub(start);
  const reach = THREE.MathUtils.clamp(axis.length(), 0.0001, (upperLength + lowerLength) * 0.995);
  axis.normalize();
  const cosine = THREE.MathUtils.clamp(
    (upperLength * upperLength + reach * reach - lowerLength * lowerLength) / (2 * upperLength * reach),
    -1,
    1,
  );
  const sine = Math.sqrt(1 - cosine * cosine);
  poleDirection.copy(pole).sub(start);
  poleDirection.addScaledVector(axis, -poleDirection.dot(axis)).normalize();
  elbow
    .copy(start)
    .addScaledVector(axis, cosine * upperLength)
    .addScaledVector(poleDirection, sine * upperLength);
  swingBone(upper, middle, elbow, weight);
  lower.getWorldPosition(middle);
  effector.getWorldPosition(end);
  swingBone(lower, end, target, weight);
}

export function aimBone(bone: THREE.Object3D, target: THREE.Vector3, weight: number, maxAngle: number): void {
  if (weight <= 0.001) return;
  bone.getWorldPosition(pivot);
  bone.getWorldQuaternion(worldRotation);
  forward.set(0, 0, 1).applyQuaternion(worldRotation);
  desired.copy(target).sub(pivot).normalize();
  const angle = forward.angleTo(desired);
  if (angle < 0.0001) return;
  delta.setFromUnitVectors(forward, desired);
  limited.copy(identity).slerp(delta, Math.min(1, maxAngle / angle));
  applyWorldRotation(bone, limited, weight);
}

export function rotateLocal(bone: THREE.Object3D, rotation: THREE.Quaternion): void {
  bone.quaternion.multiply(rotation);
}
