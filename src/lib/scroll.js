import { clamp } from './math';

const MAX_SPEED_VH = 140;
const MAX_LEAD_VH = 60;
const EASE = 0.075;
const KEYS = { ArrowDown: 0.14, ArrowUp: -0.14, PageDown: 0.85, PageUp: -0.85, ' ': 0.85 };

const engine = {
  current: 0,
  target: 0,
  running: false,
  locked: false,
  raf: 0,
  last: 0,
};

export function lockScroll(locked) {
  engine.locked = locked;
  document.documentElement.classList.toggle('is-locked', locked);
}

const vh = () => window.innerHeight / 100;
const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;
const clampToPage = (y) => clamp(y, 0, Math.max(0, maxScroll()));

function frame(now) {
  const dt = Math.min(0.05, (now - engine.last) / 1000);
  engine.last = now;
  const diff = engine.target - engine.current;
  if (Math.abs(diff) < 0.4) {
    engine.current = engine.target;
    window.scrollTo(0, engine.current);
    engine.running = false;
    return;
  }
  const limit = MAX_SPEED_VH * vh() * dt;
  const eased = diff * (1 - Math.pow(1 - EASE, dt * 60));
  engine.current += clamp(eased, -limit, limit);
  window.scrollTo(0, engine.current);
  engine.raf = requestAnimationFrame(frame);
}

function wake() {
  if (engine.running) return;
  engine.running = true;
  engine.last = performance.now();
  engine.raf = requestAnimationFrame(frame);
}

function push(dy) {
  if (engine.locked) return;
  const lead = MAX_LEAD_VH * vh();
  const ahead = clamp(engine.target + dy, engine.current - lead, engine.current + lead);
  engine.target = clampToPage(ahead);
  wake();
}

export function initScroll() {
  if (engine.ready) return;
  engine.ready = true;
  engine.current = engine.target = window.scrollY;

  window.addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      push(e.deltaY * unit);
    },
    { passive: false },
  );

  window.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, textarea, select, button, [contenteditable]')) return;
    const k = KEYS[e.key];
    if (k === undefined) return;
    e.preventDefault();
    push((e.shiftKey && e.key === ' ' ? -k : k) * window.innerHeight);
  });

  window.addEventListener(
    'scroll',
    () => {
      if (engine.running) return;
      engine.current = engine.target = window.scrollY;
    },
    { passive: true },
  );
}

export const getScrollTarget = () => engine.target;

export function scrollToY(y, immediate = false) {
  if (immediate) {
    cancelAnimationFrame(engine.raf);
    engine.running = false;
    engine.current = engine.target = clampToPage(y);
    window.scrollTo(0, engine.current);
    return;
  }
  engine.target = clampToPage(y);
  wake();
}

export function shiftScroll(offset) {
  engine.current = Math.max(0, engine.current + offset);
  engine.target = Math.max(0, engine.target + offset);
  window.scrollTo(0, engine.current);
}
