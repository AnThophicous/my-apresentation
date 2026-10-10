import { Fragment, useEffect, useRef, useState } from 'react';
import { animate, motion, useInView, useSpring } from 'framer-motion';

export function Magnetic({ children, strength = 0.35, className = '', as = 'span', ...rest }) {
  const ref = useRef(null);
  const x = useSpring(0, { stiffness: 240, damping: 15, mass: 0.6 });
  const y = useSpring(0, { stiffness: 240, damping: 15, mass: 0.6 });
  const Comp = motion[as];
  return (
    <Comp
      ref={ref}
      className={`magnetic ${className}`}
      style={{ x, y }}
      onPointerMove={(e) => {
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      {...rest}
    >
      {children}
    </Comp>
  );
}

const GLYPHS = '01#/\\<>_-+=*ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function Scramble({ text, className = '' }) {
  const [out, setOut] = useState(text);
  const raf = useRef(0);
  useEffect(() => setOut(text), [text]);
  const run = () => {
    cancelAnimationFrame(raf.current);
    const start = performance.now();
    const tick = (now) => {
      const t = now - start;
      let done = true;
      const s = text
        .split('')
        .map((ch, i) => {
          if (ch === ' ' || t > 40 + i * 28) return ch;
          done = false;
          return GLYPHS[(Math.random() * GLYPHS.length) | 0];
        })
        .join('');
      setOut(s);
      if (!done) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return (
    <span className={`scramble ${className}`} onPointerEnter={run} aria-label={text}>
      <span aria-hidden>{out}</span>
    </span>
  );
}

export function ProximityText({ text, min = 300, max = 900, radius = 220, className = '', as = 'span' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const el = ref.current;
    const letters = Array.from(el.querySelectorAll('.pl'));
    let mx = -9999;
    let my = -9999;
    let raf = 0;
    let active = false;
    const weights = letters.map(() => min);
    const frame = () => {
      raf = 0;
      let moving = false;
      letters.forEach((l, i) => {
        const r = l.getBoundingClientRect();
        const dx = mx - (r.left + r.width / 2);
        const dy = my - (r.top + r.height / 2);
        const d = Math.sqrt(dx * dx + dy * dy);
        const k = Math.max(0, 1 - d / radius);
        const target = min + (max - min) * k * k * (3 - 2 * k);
        weights[i] += (target - weights[i]) * 0.25;
        if (Math.abs(target - weights[i]) > 1) moving = true;
        l.style.fontVariationSettings = `'wght' ${weights[i].toFixed(0)}`;
      });
      if (moving || active) raf = requestAnimationFrame(frame);
    };
    const move = (e) => {
      mx = e.clientX;
      my = e.clientY;
      const r = el.getBoundingClientRect();
      active = mx > r.left - radius && mx < r.right + radius && my > r.top - radius && my < r.bottom + radius;
      if (!raf) raf = requestAnimationFrame(frame);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      cancelAnimationFrame(raf);
    };
  }, [text, min, max, radius]);

  const Comp = as;
  return (
    <Comp ref={ref} className={`prox ${className}`} aria-label={text}>
      {text.split(' ').map((word, wi, arr) => (
        <Fragment key={wi}>
          <span className="pw" aria-hidden>
            {word.split('').map((ch, i) => (
              <span className="pl" key={i} style={{ fontVariationSettings: `'wght' ${min}` }}>
                {ch}
              </span>
            ))}
          </span>
          {wi < arr.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </Comp>
  );
}

export function CountUp({ value, prefix = '+', duration = 1.6 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-15% 0px' });
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = prefix + Math.round(v);
      },
    });
    return () => c.stop();
  }, [inView, value, prefix, duration]);
  return (
    <span ref={ref} className="count">
      {prefix}0
    </span>
  );
}

export function RevealLines({ lines, className = '', delay = 0, as = 'div' }) {
  const Comp = motion[as];
  return (
    <Comp className={`reveal ${className}`} initial="hide" whileInView="show" viewport={{ once: true, margin: '-12% 0px' }}>
      {lines.map((l, i) => (
        <span className="rl-mask" key={i}>
          <motion.span
            className="rl"
            variants={{ hide: { y: '110%' }, show: { y: '0%' } }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: delay + i * 0.08 }}
          >
            {l}
          </motion.span>
        </span>
      ))}
    </Comp>
  );
}
