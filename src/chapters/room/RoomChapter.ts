import * as THREE from 'three';
import { createLayer, type Context } from '@/app/Context';
import { ROOM_BEATS } from '@/content/copy';
import { clamp, damp, easeInCubic, easeInOutCubic, progressBetween, smoothstep } from '@/core/math';
import { Beats } from '@/ui/Beats';
import { CAMERA, HANDS, SCREEN_CENTER, SCREEN_ENTRY, SCREEN_FOCUS } from '@/webgl/room/layout';
import { RoomView } from '@/webgl/room/RoomView';
import type { Chapter, ChapterOutput, Frame } from '../Chapter';
import { createCutsceneState, CUTSCENE, sampleCutscene, type CutsceneState } from './cutscene';
import './room.css';

const GATE_AT = 0.22;
const HINT_FROM = 0.16;
const PULL_START = 0.28;
const PULL_END = 0.8;
const DISSOLVE_START = 0.3;
const DISSOLVE_END = 0.86;
const DIVE_START = 0.8;
const FADE_OUT_START = 0.95;

const PULL_POSITIONS = new THREE.CatmullRomCurve3([
  CAMERA.shoulderPosition.clone(),
  new THREE.Vector3(0.3, 1.8, 2.3),
  new THREE.Vector3(2.0, 2.7, 4.1),
  new THREE.Vector3(3.3, 3.3, 5.6),
]);
const PULL_TARGETS = new THREE.CatmullRomCurve3([
  CAMERA.shoulderTarget.clone(),
  new THREE.Vector3(-1.2, 1.0, 0.8),
  new THREE.Vector3(-0.6, 0.95, 0.4),
  new THREE.Vector3(-0.5, 0.95, 0.3),
]);

export class RoomChapter implements Chapter {
  readonly id = 'room' as const;
  readonly view: RoomView;
  private readonly layer: HTMLElement;
  private readonly beats: Beats;
  private readonly marker: HTMLButtonElement;
  private readonly cutscene: CutsceneState = createCutsceneState();
  private readonly cameraPosition = new THREE.Vector3();
  private readonly cameraTarget = new THREE.Vector3();
  private readonly overviewPosition = new THREE.Vector3();
  private readonly projected = new THREE.Vector3();
  private readonly lookTarget = new THREE.Vector3();
  private readonly offset = new THREE.Vector3();
  private startedAt: number | null = null;
  private completed = false;
  private hoveringComputer = false;
  private active = false;
  private progress = 0;
  private time = 0;
  private nextStep = 0;
  private typingSoundAt = 0;
  private booted = false;
  private dived = false;
  private parallaxX = 0;
  private parallaxY = 0;

  constructor(private readonly context: Context) {
    this.view = new RoomView(context.quality);
    this.layer = createLayer(context, 'room');
    this.beats = new Beats(this.layer, ROOM_BEATS);
    this.marker = document.createElement('button');
    this.marker.type = 'button';
    this.marker.className = 'room__marker';
    this.marker.dataset.cursor = 'Switch on';
    this.marker.setAttribute('aria-label', 'Switch on the computer');
    this.marker.innerHTML = '<span class="room__marker-label caption">Switch it on</span>';
    this.marker.addEventListener('click', () => this.begin());
    this.layer.append(this.marker);
    this.view.resize(context.viewport.size);
    context.viewport.resized.on((size) => this.view.resize(size));
    context.pointer.pressed.on(this.handlePress);
    window.addEventListener('keydown', this.handleKey);
    context.story.gateOpened.on((gate) => gate === 'computer' && !this.startedAt && this.skipToEnd());
  }

  async prepare(): Promise<void> {
    const { renderer } = this.context;
    await this.view.prepare(renderer.gl);
    this.placeOverviewCamera(0);
    await renderer.compile(this.view);
    void this.view.loadPerson().then(() => renderer.compile(this.view));
  }

  enter(): void {
    this.active = true;
    this.layer.classList.add('is-active');
    this.view.invalidateShadows();
  }

  leave(): void {
    this.active = false;
    this.layer.classList.remove('is-active');
  }

  update(progress: number, frame: Frame, output: ChapterOutput): void {
    this.progress = progress;
    this.time = frame.time;
    this.parallaxX = damp(this.parallaxX, frame.parallaxX, 2, frame.delta);
    this.parallaxY = damp(this.parallaxY, frame.parallaxY, 2, frame.delta);
    const sceneTime = this.sceneTime();
    sampleCutscene(sceneTime, this.cutscene);
    this.updateCamera(progress);
    this.updatePerson(frame.delta, sceneTime);
    this.updateScreen();
    this.updateDissolve(progress, frame.time);
    this.updateGate(progress, frame);
    this.playCues(sceneTime);
    this.playDiveCue(progress);
    this.beats.update(progress);
    this.mix(progress, sceneTime);
    this.writeOutput(progress, output);
    if (this.startedAt !== null && !this.completed && sceneTime >= CUTSCENE.duration) this.finish();
  }

  private sceneTime(): number {
    if (this.completed && this.startedAt === null) return CUTSCENE.duration;
    if (this.startedAt === null) return 0;
    return Math.min(CUTSCENE.duration, this.time - this.startedAt);
  }

  private begin(): void {
    if (this.startedAt !== null || this.completed || !this.active || this.progress < HINT_FROM) return;
    this.startedAt = this.time;
    this.context.sound.cue('press');
    this.marker.classList.remove('is-visible');
  }

  private finish(): void {
    this.completed = true;
    this.context.story.open('computer');
  }

  private skipToEnd(): void {
    this.completed = true;
    this.startedAt = null;
  }

  private placeOverviewCamera(progress: number): void {
    const { aspect } = this.context.viewport.size;
    const fit = aspect < 1 ? 1.75 / Math.max(aspect, 0.45) : 1;
    const distance = CAMERA.overviewDistance * fit * (1 + (1 - smoothstep(0, GATE_AT, progress)) * 0.18);
    const orbit = this.parallaxX * 0.06;
    const direction = CAMERA.overviewDirection.clone().applyAxisAngle(THREE.Object3D.DEFAULT_UP, orbit);
    direction.y += this.parallaxY * 0.04;
    this.overviewPosition.copy(CAMERA.overviewTarget).addScaledVector(direction.normalize(), distance);
  }

  private updateCamera(progress: number): void {
    this.placeOverviewCamera(progress);
    const blend = this.cutscene.camera;
    this.cameraPosition.lerpVectors(this.overviewPosition, CAMERA.shoulderPosition, blend);
    this.cameraTarget.lerpVectors(CAMERA.overviewTarget, CAMERA.shoulderTarget, blend);
    const pull = easeInOutCubic(progressBetween(PULL_START, PULL_END, progress));
    const dive = easeInCubic(progressBetween(DIVE_START, 1, progress));
    if (pull > 0 && blend > 0.999) {
      PULL_POSITIONS.getPointAt(pull, this.cameraPosition);
      PULL_TARGETS.getPointAt(pull, this.cameraTarget);
      this.cameraPosition.lerp(SCREEN_ENTRY, dive);
      this.cameraTarget.lerp(SCREEN_FOCUS, smoothstep(0, 0.35, dive));
    }
    const camera = this.view.camera;
    camera.position.copy(this.cameraPosition);
    const portrait = this.context.viewport.size.isPortrait ? 1.55 : 1;
    camera.fov =
      (THREE.MathUtils.lerp(24, 34, blend) + pull * 4 - dive * 8) * THREE.MathUtils.lerp(1, portrait, blend);
    camera.updateProjectionMatrix();
    camera.lookAt(this.cameraTarget);
    camera.updateMatrixWorld();
  }

  private updatePerson(delta: number, sceneTime: number): void {
    const person = this.view.person;
    if (!person) return;
    const state = this.cutscene;
    person.root.position.copy(state.position);
    person.root.rotation.y = state.yaw;
    Object.assign(person.pose, {
      sit: state.sit,
      seatDrop: state.seatDrop,
      seatBack: state.seatBack,
      lean: state.lean,
      walk: state.walk,
      handsOnKnees: state.handsOnKnees,
      typing: state.typing,
    });
    const jitter = state.typing > 0 ? Math.sin(sceneTime * 23) * 0.006 : 0;
    person.leftHandTarget
      .copy(HANDS.left)
      .add(this.offset.set(0, Math.max(0, jitter), Math.sin(sceneTime * 7) * 0.02));
    person.rightHandTarget
      .copy(HANDS.right)
      .add(this.offset.set(0, Math.max(0, -jitter), Math.cos(sceneTime * 6) * 0.02));
    person.leftPole.copy(HANDS.leftPole);
    person.rightPole.copy(HANDS.rightPole);
    this.lookTarget.copy(this.view.camera.position).lerp(SCREEN_CENTER, state.lookAtComputer);
    person.lookTarget.copy(this.lookTarget);
    person.lookWeight = 1 - state.walk * 0.6;
    person.update(delta);
    if (this.startedAt !== null && sceneTime < CUTSCENE.duration) this.view.invalidateShadows();
  }

  private updateScreen(): void {
    const time = this.cutscene.screenTime;
    this.view.screen.render(time);
    this.view.setScreenGlow(time < 0 ? 0 : clamp(time / 1.6));
  }

  private updateDissolve(progress: number, time: number): void {
    const dissolve = this.view.dissolve;
    dissolve.uDissolve.value = progressBetween(DISSOLVE_START, DISSOLVE_END, progress);
    dissolve.uDissolveTime.value = time;
    dissolve.uDissolveReach.value = 5.2;
  }

  private updateGate(progress: number, frame: Frame): void {
    const waiting = this.active && this.startedAt === null && !this.completed && progress >= HINT_FROM;
    this.hoveringComputer =
      waiting &&
      frame.pointer.isActive &&
      this.view.pointsAtComputer(frame.pointer.normalizedX, frame.pointer.normalizedY);
    this.marker.classList.toggle('is-visible', waiting);
    if (!waiting) return;
    this.projected.copy(SCREEN_CENTER).project(this.view.camera);
    const x = (this.projected.x * 0.5 + 0.5) * frame.size.width;
    const y = (-this.projected.y * 0.5 + 0.5) * frame.size.height;
    this.marker.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  }

  private playDiveCue(progress: number): void {
    const diving = progress > DIVE_START + 0.04;
    if (diving && !this.dived) this.context.sound.cue('whoosh', { gain: 0.9 });
    this.dived = diving;
  }

  private playCues(sceneTime: number): void {
    const { sound } = this.context;
    if (this.startedAt === null) return;
    if (this.cutscene.walking && sceneTime >= this.nextStep) {
      sound.cue('step', {
        pan: this.nextStep % (CUTSCENE.stepInterval * 2) < CUTSCENE.stepInterval ? -0.3 : 0.3,
      });
      this.nextStep = sceneTime + CUTSCENE.stepInterval;
    }
    const booted = this.cutscene.screenTime >= 0;
    if (booted && !this.booted) sound.cue('boot');
    this.booted = booted;
    if (this.cutscene.typing > 0.5 && sceneTime >= this.typingSoundAt && sceneTime < CUTSCENE.duration) {
      sound.cue('keys', { gain: 0.6 });
      this.typingSoundAt = sceneTime + 2.6;
    }
  }

  private mix(progress: number, sceneTime: number): void {
    const vanish = smoothstep(DISSOLVE_START, DISSOLVE_END, progress);
    this.context.sound.mix({
      air: 0.2 + vanish * 0.4,
      waves: 0,
      underwater: 0,
      depth: 0,
      pad: 0.2 + vanish * 0.3,
      shimmer: vanish * 0.5,
      tension: 0,
      room: (1 - vanish) * (sceneTime > CUTSCENE.bootAt ? 1 : 0.7),
      pulse: 0,
      motion: 0,
      silence: 0,
    });
  }

  private writeOutput(progress: number, output: ChapterOutput): void {
    output.post.exposure = 1.0;
    output.post.contrast = 1.08;
    output.post.vignette = 0.14;
    output.post.grain = 0.045;
    output.post.fade = Math.max(1 - smoothstep(0, 0.07, progress), smoothstep(FADE_OUT_START, 1, progress));
    output.post.fadeTone = 1;
    output.cursor = this.hoveringComputer ? 'Switch on' : null;
    output.theme = 'light';
    const minutes = 47 + Math.floor(this.time / 60);
    output.meter = { label: 'Local time', value: `02:${String(minutes % 60).padStart(2, '0')} am` };
  }

  private readonly handlePress = (event: PointerEvent): void => {
    if (!this.hoveringComputer || !(event.target instanceof HTMLCanvasElement)) return;
    this.begin();
  };

  private readonly handleKey = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' && this.active && this.progress >= HINT_FROM) this.begin();
  };
}
