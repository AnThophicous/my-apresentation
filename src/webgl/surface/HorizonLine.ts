import { clamp, smoothstep } from '@/core/math';

export interface HorizonInput {
  x: number;
  offset: number;
  active: boolean;
}

export interface Ripple {
  x: number;
  y: number;
  age: number;
  strength: number;
}

const STEP = 1 / 240;
const MAX_STEPS = 10;
const TENSION = 2600;
const RESTORE = 14;
const DAMPING = 2.4;
const GRAB_RADIUS = 130;
const GRAB_SPREAD = 0.045;
const GRAB_STIFFNESS = 90;
const GRAB_FOLLOW = 0.5;
const LIMIT = 70;
const RIPPLE_SLOTS = 4;
const RIPPLE_LIFETIME = 2.6;

export class HorizonLine {
  readonly samples: Float32Array;
  readonly ripples: Ripple[] = [];
  private readonly velocities: Float32Array;
  private accumulator = 0;
  private lastOffset = 0;
  private wasNear = false;

  constructor(readonly count = 160) {
    this.samples = new Float32Array(count);
    this.velocities = new Float32Array(count);
  }

  impulse(x: number, amount: number, width = 0.04): void {
    for (let i = 0; i < this.count; i += 1) {
      const distance = i / (this.count - 1) - x;
      this.velocities[i]! += amount * Math.exp(-(distance * distance) / (width * width));
    }
  }

  addRipple(x: number, y: number, strength: number): void {
    this.ripples.unshift({ x, y, age: 0, strength });
    if (this.ripples.length > RIPPLE_SLOTS) this.ripples.length = RIPPLE_SLOTS;
  }

  update(delta: number, input: HorizonInput): boolean {
    const crossed = this.trackCrossing(input);
    this.accumulator = Math.min(this.accumulator + delta, STEP * MAX_STEPS);
    while (this.accumulator >= STEP) {
      this.step(input);
      this.accumulator -= STEP;
    }
    this.ripples.forEach((ripple) => (ripple.age += delta));
    while (this.ripples.length && this.ripples[this.ripples.length - 1]!.age > RIPPLE_LIFETIME)
      this.ripples.pop();
    return crossed;
  }

  private trackCrossing(input: HorizonInput): boolean {
    const near = input.active && Math.abs(input.offset) < GRAB_RADIUS;
    const crossed = near && this.wasNear && Math.sign(input.offset) !== Math.sign(this.lastOffset);
    if (crossed) this.impulse(input.x, (input.offset - this.lastOffset) * 14, 0.03);
    this.wasNear = near;
    this.lastOffset = input.offset;
    return crossed;
  }

  private step(input: HorizonInput): void {
    const { samples, velocities, count } = this;
    const proximity = input.active
      ? 1 - smoothstep(GRAB_RADIUS * 0.35, GRAB_RADIUS, Math.abs(input.offset))
      : 0;
    for (let i = 0; i < count; i += 1) {
      const left = samples[Math.max(0, i - 1)]!;
      const right = samples[Math.min(count - 1, i + 1)]!;
      const height = samples[i]!;
      let acceleration = TENSION * (left + right - 2 * height) - RESTORE * height - DAMPING * velocities[i]!;
      if (proximity > 0) {
        const distance = i / (count - 1) - input.x;
        const weight = Math.exp(-(distance * distance) / (GRAB_SPREAD * GRAB_SPREAD)) * proximity;
        acceleration += (input.offset * GRAB_FOLLOW - height) * GRAB_STIFFNESS * weight;
      }
      velocities[i] = velocities[i]! + acceleration * STEP;
    }
    for (let i = 0; i < count; i += 1) {
      samples[i] = clamp(samples[i]! + velocities[i]! * STEP, -LIMIT, LIMIT);
    }
  }
}
