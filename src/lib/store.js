import { useSyncExternalStore } from 'react';

const listeners = new Set();
let state = {
  W: typeof window !== 'undefined' ? window.innerWidth : 1280,
  H: typeof window !== 'undefined' ? window.innerHeight : 800,
  vh: typeof window !== 'undefined' ? window.innerHeight / 100 : 8,
  loopY: Infinity,
  touch: false,
  sound: false,
};

export const store = {
  get: () => state,
  set(patch) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useStore(selector) {
  return useSyncExternalStore(store.subscribe, () => selector(state));
}

export function measureViewport(force = false) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  if (!W || !H) return;
  const s = store.get();
  const touch = window.matchMedia('(pointer: coarse)').matches;
  if (!force && touch && W === s.W && Math.abs(H - s.H) < 160) return;
  document.documentElement.style.setProperty('--vh', `${H / 100}px`);
  store.set({ W, H, vh: H / 100, touch });
}

export const ropeGeometry = (W, H) => ({
  x: Math.round(W / 2),
  L: Math.round(H * 0.36),
  width: W < 640 ? 5 : 6,
  handleR: W < 640 ? 9 : 10,
});
