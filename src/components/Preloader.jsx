import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ropeGeometry, store, useStore } from '../lib/store';
import { ambient } from '../lib/audio';
import { lockScroll } from '../lib/scroll';

const MIN_SECONDS = 1.4;
const MAX_WAIT_MS = 6000;
const spring = { type: 'spring', stiffness: 260, damping: 22 };

function waitForLoad() {
  const page =
    document.readyState === 'complete' ? Promise.resolve() : new Promise((r) => window.addEventListener('load', r, { once: true }));
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  const timeout = new Promise((r) => setTimeout(r, MAX_WAIT_MS));
  return Promise.race([Promise.all([page, fonts]), timeout]);
}

export default function Preloader() {
  const W = useStore((s) => s.W);
  const H = useStore((s) => s.H);
  const g = ropeGeometry(W, H);
  const line = useRef(null);
  const counter = useRef(null);
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    lockScroll(true);
    let loaded = false;
    let shown = 0;
    let raf = 0;
    const t0 = performance.now();
    let last = t0;
    waitForLoad().then(() => (loaded = true));
    const tick = (now) => {
      const t = (now - t0) / 1000;
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      const target = loaded && t > MIN_SECONDS ? 1 : Math.min(0.92, t / 2.4);
      shown += (target - shown) * (1 - Math.pow(0.004, dt));
      if (target === 1 && shown > 0.997) shown = 1;
      const { L } = ropeGeometry(store.get().W, store.get().H);
      if (line.current) line.current.setAttribute('y2', (L * shown).toFixed(1));
      if (counter.current) counter.current.textContent = String(Math.round(shown * 100)).padStart(3, '0');
      if (shown === 1) setReady(true);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const enter = async (withSound) => {
    if (leaving) return;
    if (withSound) {
      await ambient.enable();
      store.set({ sound: true });
    }
    setLeaving(true);
  };

  useEffect(() => {
    if (!ready) return;
    const onKey = (e) => e.key === 'Enter' && enter(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (gone) return null;

  return (
    <motion.div
      className="preloader"
      initial={{ opacity: 1 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      onAnimationComplete={() => {
        if (!leaving) return;
        lockScroll(false);
        setGone(true);
      }}
    >
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
        <line ref={line} x1={g.x} y1={-10} x2={g.x} y2={0} stroke="#000" strokeWidth={g.width} strokeLinecap="round" />
        <motion.circle
          cx={g.x}
          cy={g.L}
          r={g.handleR}
          fill="#000"
          initial={{ scale: 0 }}
          animate={{ scale: ready ? 1 : 0 }}
          transition={spring}
          style={{ transformOrigin: `${g.x}px ${g.L}px` }}
        />
      </svg>
      <span ref={counter} className="preloader-count">
        000
      </span>
      <AnimatePresence>
        {ready && !leaving && (
          <motion.div
            className="preloader-enter"
            style={{ top: g.L + 46 }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ ...spring, delay: 0.15 }}
          >
            <button className="enter-btn enter-btn--solid" onClick={() => enter(true)} data-cursor="entrar">
              Entrar com som
            </button>
            <button className="enter-btn" onClick={() => enter(false)} data-cursor="entrar">
              Sem som
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
