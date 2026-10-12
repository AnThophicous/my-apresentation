import * as THREE from 'three';
import { easeInOutCubic, easeInOutSine, progressBetween, smoothstep } from '@/core/math';
import { SPOTS, WALK_PATH } from '@/webgl/room/layout';

export const CUTSCENE = {
  noticeAt: 0.25,
  standStart: 0.6,
  standEnd: 1.8,
  walkStart: 1.65,
  walkEnd: 4.35,
  turnStart: 3.95,
  sitStart: 4.25,
  sitEnd: 5.35,
  bootAt: 5.1,
  typingStart: 5.5,
  typingEnd: 6.3,
  cameraStart: 5.7,
  cameraEnd: 8.3,
  duration: 8.5,
  stepInterval: 0.49,
} as const;

export interface CutsceneState {
  position: THREE.Vector3;
  yaw: number;
  sit: number;
  seatDrop: number;
  seatBack: number;
  lean: number;
  walk: number;
  handsOnKnees: number;
  typing: number;
  lookAtComputer: number;
  screenTime: number;
  camera: number;
  walking: boolean;
}

export function createCutsceneState(): CutsceneState {
  return {
    position: SPOTS.bed.position.clone(),
    yaw: SPOTS.bed.yaw,
    sit: 1,
    seatDrop: SPOTS.bed.seatDrop,
    seatBack: SPOTS.bed.seatBack,
    lean: 0,
    walk: 0,
    handsOnKnees: 0.85,
    typing: 0,
    lookAtComputer: 0,
    screenTime: -1,
    camera: 0,
    walking: false,
  };
}

const tangent = new THREE.Vector3();

export function sampleCutscene(time: number, state: CutsceneState): CutsceneState {
  const c = CUTSCENE;
  const stand = easeInOutSine(progressBetween(c.standStart, c.standEnd, time));
  const walkProgress = progressBetween(c.walkStart, c.walkEnd, time);
  const sitDown = easeInOutSine(progressBetween(c.sitStart, c.sitEnd, time));
  const atChair = time >= c.sitStart;
  state.sit = atChair ? sitDown : 1 - stand;
  state.seatDrop = atChair ? SPOTS.chair.seatDrop : SPOTS.bed.seatDrop;
  state.seatBack = atChair ? SPOTS.chair.seatBack : SPOTS.bed.seatBack;
  state.lean =
    Math.sin(stand * Math.PI) * 0.42 * (atChair ? 0 : 1) + Math.sin(sitDown * Math.PI) * 0.3 + sitDown * 0.14;
  state.handsOnKnees = 0.85 * (1 - smoothstep(c.standStart, c.standStart + 0.5, time));
  state.walk =
    smoothstep(c.walkStart, c.walkStart + 0.35, time) * (1 - smoothstep(c.walkEnd - 0.35, c.walkEnd, time));
  state.walking = time > c.walkStart + 0.15 && time < c.walkEnd - 0.2;
  const travel = easeInOutSine(walkProgress);
  WALK_PATH.getPointAt(travel, state.position);
  WALK_PATH.getTangentAt(Math.min(travel, 0.999), tangent);
  const walkingYaw = Math.atan2(tangent.x, tangent.z);
  const leaving = smoothstep(c.walkStart - 0.25, c.walkStart + 0.25, time);
  const arriving = smoothstep(c.turnStart, c.walkEnd, time);
  state.yaw = lerpAngle(lerpAngle(SPOTS.bed.yaw, walkingYaw, leaving), SPOTS.chair.yaw, arriving);
  state.typing = smoothstep(c.typingStart, c.typingEnd, time);
  state.lookAtComputer = smoothstep(c.noticeAt, c.noticeAt + 0.5, time);
  state.screenTime = time >= c.bootAt ? time - c.bootAt : -1;
  state.camera = easeInOutCubic(progressBetween(c.cameraStart, c.cameraEnd, time));
  return state;
}

function lerpAngle(from: number, to: number, t: number): number {
  const difference = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + difference * t;
}
