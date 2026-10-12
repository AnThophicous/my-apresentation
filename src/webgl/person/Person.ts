import * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { damp } from '@/core/math';
import { applyPatches, type ShaderPatch } from '@/webgl/materials/patch';
import { hairPatch } from './hair';
import { aimBone, rotateLocal, solveTwoBoneIK } from './rig';

export interface PersonPose {
  sit: number;
  seatDrop: number;
  seatBack: number;
  lean: number;
  walk: number;
  handsOnKnees: number;
  typing: number;
}

type BoneName =
  | 'Hips'
  | 'Spine'
  | 'Spine1'
  | 'Spine2'
  | 'Neck'
  | 'Head'
  | 'LeftEye'
  | 'RightEye'
  | 'LeftUpLeg'
  | 'RightUpLeg'
  | 'LeftLeg'
  | 'RightLeg'
  | 'LeftFoot'
  | 'RightFoot'
  | 'LeftArm'
  | 'RightArm'
  | 'LeftForeArm'
  | 'RightForeArm'
  | 'LeftHand'
  | 'RightHand';

const HIP_FLEX = THREE.MathUtils.degToRad(-88);
const KNEE_FLEX = THREE.MathUtils.degToRad(92);
const ANKLE_FLEX = THREE.MathUtils.degToRad(-8);
const HEAD_LIMIT = THREE.MathUtils.degToRad(55);
const EYE_LIMIT = THREE.MathUtils.degToRad(24);
const CENTIMETERS = 100;

interface Finish {
  tone: number;
  roughness: number;
}

const FINISHES: Record<string, Finish> = {
  skin: { tone: 0.42, roughness: 0.58 },
  hair: { tone: 0.035, roughness: 0.42 },
  shirt: { tone: 0.88, roughness: 0.9 },
  pants: { tone: 0.055, roughness: 0.82 },
  sock: { tone: 0.7, roughness: 0.92 },
  shoe: { tone: 0.92, roughness: 0.5 },
  sole: { tone: 0.07, roughness: 0.72 },
};

export class Person {
  readonly root = new THREE.Group();
  readonly pose: PersonPose = {
    sit: 0,
    seatDrop: 0.5,
    seatBack: 0.08,
    lean: 0,
    walk: 0,
    handsOnKnees: 0,
    typing: 0,
  };
  readonly lookTarget = new THREE.Vector3(0, 1.6, 5);
  readonly leftHandTarget = new THREE.Vector3();
  readonly rightHandTarget = new THREE.Vector3();
  readonly leftPole = new THREE.Vector3();
  readonly rightPole = new THREE.Vector3();
  lookWeight = 1;
  private readonly bones = new Map<BoneName, THREE.Bone>();
  private readonly mixer: THREE.AnimationMixer;
  private readonly idle: THREE.AnimationAction;
  private readonly walk: THREE.AnimationAction;
  private readonly materials: THREE.MeshStandardMaterial[] = [];
  private readonly smoothedLook = new THREE.Vector3(0, 1.6, 5);
  private readonly scratch = new THREE.Quaternion();
  private readonly axisX = new THREE.Vector3(1, 0, 0);
  private readonly kneeLeft = new THREE.Vector3();
  private readonly kneeRight = new THREE.Vector3();
  private readonly sideways = new THREE.Vector3();
  private readonly backward = new THREE.Vector3();

  constructor(gltf: GLTF, extraPatches: readonly ShaderPatch[]) {
    const scene = gltf.scene;
    scene.traverse((object) => {
      if (object instanceof THREE.Bone) this.registerBone(object);
      if (object instanceof THREE.SkinnedMesh) this.prepareMesh(object, extraPatches);
    });
    this.root.add(scene);
    this.addEyes(extraPatches);
    this.mixer = new THREE.AnimationMixer(scene);
    this.idle = this.mixer.clipAction(this.clip(gltf, 'idle'));
    this.walk = this.mixer.clipAction(this.clip(gltf, 'walk'));
    this.idle.play();
    this.walk.play();
    this.walk.setEffectiveWeight(0);
  }

  bone(name: BoneName): THREE.Bone {
    const bone = this.bones.get(name);
    if (!bone) throw new Error(`Missing bone ${name}`);
    return bone;
  }

  setShadows(cast: boolean): void {
    this.root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = cast;
        object.receiveShadow = true;
      }
    });
  }

  update(delta: number): void {
    const { pose } = this;
    this.idle.setEffectiveWeight(1 - pose.walk);
    this.walk.setEffectiveWeight(pose.walk);
    this.mixer.update(delta);
    this.applySeating();
    this.root.updateMatrixWorld(true);
    this.placeHands();
    this.applyLook(delta);
  }

  private applySeating(): void {
    const { sit, seatDrop, seatBack, lean } = this.pose;
    const hips = this.bone('Hips');
    hips.position.y -= seatDrop * sit * CENTIMETERS;
    hips.position.z -= seatBack * sit * CENTIMETERS;
    for (const side of ['Left', 'Right'] as const) {
      rotateLocal(this.bone(`${side}UpLeg`), this.scratch.setFromAxisAngle(this.axisX, HIP_FLEX * sit));
      rotateLocal(this.bone(`${side}Leg`), this.scratch.setFromAxisAngle(this.axisX, KNEE_FLEX * sit));
      rotateLocal(this.bone(`${side}Foot`), this.scratch.setFromAxisAngle(this.axisX, ANKLE_FLEX * sit));
    }
    rotateLocal(this.bone('Spine'), this.scratch.setFromAxisAngle(this.axisX, lean * 0.5));
    rotateLocal(this.bone('Spine1'), this.scratch.setFromAxisAngle(this.axisX, lean * 0.35));
  }

  private placeHands(): void {
    const { handsOnKnees, typing } = this.pose;
    if (handsOnKnees > 0.001) {
      this.bone('LeftLeg').getWorldPosition(this.kneeLeft);
      this.bone('RightLeg').getWorldPosition(this.kneeRight);
      this.reachKnee('Left', this.kneeLeft, handsOnKnees);
      this.reachKnee('Right', this.kneeRight, handsOnKnees);
    }
    if (typing > 0.001) {
      solveTwoBoneIK(
        this.bone('LeftArm'),
        this.bone('LeftForeArm'),
        this.bone('LeftHand'),
        this.leftHandTarget,
        this.leftPole,
        typing,
      );
      solveTwoBoneIK(
        this.bone('RightArm'),
        this.bone('RightForeArm'),
        this.bone('RightHand'),
        this.rightHandTarget,
        this.rightPole,
        typing,
      );
    }
  }

  private reachKnee(side: 'Left' | 'Right', knee: THREE.Vector3, weight: number): void {
    const target = side === 'Left' ? this.leftHandTarget : this.rightHandTarget;
    const pole = side === 'Left' ? this.leftPole : this.rightPole;
    const sideSign = side === 'Left' ? 1 : -1;
    const hips = this.bone('Hips').getWorldPosition(pole);
    this.sideways.set(sideSign * 0.4, 0, 0).applyQuaternion(this.root.quaternion);
    this.backward.set(0, 0, -0.3).applyQuaternion(this.root.quaternion);
    target.copy(knee).lerp(hips, 0.28);
    target.y += 0.06;
    pole.copy(hips).add(this.sideways).add(this.backward);
    solveTwoBoneIK(
      this.bone(`${side}Arm`),
      this.bone(`${side}ForeArm`),
      this.bone(`${side}Hand`),
      target,
      pole,
      weight,
    );
  }

  private applyLook(delta: number): void {
    this.smoothedLook.x = damp(this.smoothedLook.x, this.lookTarget.x, 6, delta);
    this.smoothedLook.y = damp(this.smoothedLook.y, this.lookTarget.y, 6, delta);
    this.smoothedLook.z = damp(this.smoothedLook.z, this.lookTarget.z, 6, delta);
    const weight = this.lookWeight;
    aimBone(this.bone('Neck'), this.smoothedLook, 0.35 * weight, HEAD_LIMIT);
    aimBone(this.bone('Head'), this.smoothedLook, 0.8 * weight, HEAD_LIMIT);
    aimBone(this.bone('LeftEye'), this.lookTarget, weight, EYE_LIMIT);
    aimBone(this.bone('RightEye'), this.lookTarget, weight, EYE_LIMIT);
  }

  private registerBone(bone: THREE.Bone): void {
    const name = bone.name.replace(/^mixamorig:?/, '') as BoneName;
    this.bones.set(name, bone);
  }

  private prepareMesh(mesh: THREE.SkinnedMesh, extraPatches: readonly ShaderPatch[]): void {
    const source = mesh.material as THREE.Material;
    const finish = FINISHES[source.name] ?? FINISHES.skin!;
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(finish.tone, finish.tone, finish.tone),
      roughness: finish.roughness,
      metalness: 0,
    });
    material.name = source.name;
    applyPatches(
      material,
      source.name === 'hair' ? [...extraPatches, hairPatch(mesh.geometry)] : extraPatches,
    );
    mesh.material = material;
    mesh.frustumCulled = false;
    this.materials.push(material);
  }

  private addEyes(extraPatches: readonly ShaderPatch[]): void {
    const white = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.62, 0.62, 0.62),
      roughness: 0.16,
    });
    const iris = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.02, 0.02, 0.02),
      roughness: 0.08,
    });
    applyPatches(white, extraPatches);
    applyPatches(iris, extraPatches);
    const ball = new THREE.SphereGeometry(0.0122, 24, 16);
    const pupil = new THREE.SphereGeometry(0.0068, 18, 12);
    for (const side of ['LeftEye', 'RightEye'] as const) {
      const bone = this.bone(side);
      const eye = new THREE.Group();
      const sclera = new THREE.Mesh(ball, white);
      const dark = new THREE.Mesh(pupil, iris);
      dark.position.z = 0.0104;
      dark.scale.set(1, 1, 0.42);
      eye.add(sclera, dark);
      eye.scale.setScalar(CENTIMETERS);
      eye.position.z = -0.0016 * CENTIMETERS;
      bone.add(eye);
    }
  }

  private clip(gltf: GLTF, name: string): THREE.AnimationClip {
    const clip = gltf.animations.find((animation) => animation.name === name);
    if (!clip) throw new Error(`Missing animation ${name}`);
    return clip;
  }
}
