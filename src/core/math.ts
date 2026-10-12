export const TAU = Math.PI * 2;

export const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));

export const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;

export const progressBetween = (start: number, end: number, value: number): number =>
  clamp((value - start) / (end - start));

export const remap = (value: number, inMin: number, inMax: number, outMin: number, outMax: number): number =>
  lerp(outMin, outMax, progressBetween(inMin, inMax, value));

export const smoothstep = (start: number, end: number, value: number): number => {
  const t = progressBetween(start, end, value);
  return t * t * (3 - 2 * t);
};

export const damp = (current: number, target: number, lambda: number, delta: number): number =>
  lerp(current, target, 1 - Math.exp(-lambda * delta));

export const pulseWindow = (value: number, start: number, end: number, fade: number): number =>
  smoothstep(start, start + fade, value) * (1 - smoothstep(end - fade, end, value));

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const easeInCubic = (t: number): number => t * t * t;

export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeOutExpo = (t: number): number => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

export const easeInExpo = (t: number): number => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10));

export const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;

export const easeOutBack = (t: number, overshoot = 1.4): number =>
  1 + (overshoot + 1) * Math.pow(t - 1, 3) + overshoot * Math.pow(t - 1, 2);

export const seededRandom = (seed: number): (() => number) => {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

export const randomBetween = (random: () => number, min: number, max: number): number =>
  min + (max - min) * random();

export const formatIndex = (value: number, digits = 2): string => String(value).padStart(digits, '0');
