import Lenis from 'lenis';

let lenis = null;

export function initLenis() {
  if (lenis) return lenis;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  lenis = new Lenis({
    lerp: reduce ? 1 : 0.09,
    smoothWheel: !reduce,
    wheelMultiplier: 0.95,
    touchMultiplier: 1.1,
  });
  const raf = (t) => {
    lenis.raf(t);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
  if (import.meta.env.DEV) window.__lenis = lenis;
  return lenis;
}

export const getLenis = () => lenis;

export function scrollToY(y, immediate = true) {
  if (lenis) lenis.scrollTo(y, { immediate, force: true });
  else window.scrollTo(0, y);
}

export function scrollBy(dy) {
  const current = lenis ? lenis.targetScroll : window.scrollY;
  scrollToY(Math.max(0, current + dy), false);
}
