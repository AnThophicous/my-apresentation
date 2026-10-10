import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

const overrideListeners = new Set();
export function setCursorLabel(label) {
  overrideListeners.forEach((l) => l(label));
}

export default function Cursor() {
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const rx = useSpring(x, { stiffness: 420, damping: 36, mass: 0.5 });
  const ry = useSpring(y, { stiffness: 420, damping: 36, mass: 0.5 });
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState('');
  const [over, setOver] = useState(null);
  const [down, setDown] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    setEnabled(true);
    document.documentElement.classList.add('has-cursor');

    const move = (e) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
      const t = e.target.closest ? e.target.closest('[data-cursor]') : null;
      setLabel(t ? t.getAttribute('data-cursor') : '');
    };
    const leave = () => setVisible(false);
    const dn = () => setDown(true);
    const up = () => setDown(false);
    const ov = (l) => setOver(l);

    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    window.addEventListener('pointerdown', dn);
    window.addEventListener('pointerup', up);
    overrideListeners.add(ov);
    return () => {
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
      window.removeEventListener('pointerdown', dn);
      window.removeEventListener('pointerup', up);
      overrideListeners.delete(ov);
      document.documentElement.classList.remove('has-cursor');
    };
  }, [x, y]);

  if (!enabled) return null;

  const text = over || label;
  const big = !!text;
  const size = down ? (big ? 76 : 16) : big ? 96 : 32;

  return (
    <>
      <motion.div className="cursor" style={{ x: rx, y: ry, opacity: visible ? 1 : 0 }} aria-hidden>
        <motion.div
          className={`cursor-ring ${big ? 'is-big' : ''}`}
          animate={{ width: size, height: size }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
        />
        <motion.span
          className="cursor-label"
          key={text}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: big ? 1 : 0, scale: big ? 1 : 0.6 }}
          transition={{ duration: 0.25 }}
        >
          {text}
        </motion.span>
      </motion.div>
      <motion.div className="cursor" style={{ x, y, opacity: visible && !big ? 1 : 0 }} aria-hidden>
        <div className="cursor-dot" />
      </motion.div>
    </>
  );
}
