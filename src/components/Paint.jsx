import { useMemo, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useStore } from '../lib/store';

export default function Paint() {
  const ref = useRef(null);
  const W = useStore((s) => s.W);
  const H = useStore((s) => s.H);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const draw = useTransform(scrollYProgress, [0.04, 0.66], [0, 1]);
  const lead = useTransform(scrollYProgress, [0.02, 0.6], [0, 1]);
  const fill = useTransform(scrollYProgress, [0.62, 0.7], [0, 1]);
  const caption = useTransform(scrollYProgress, [0.05, 0.15, 0.45, 0.55], [0, 1, 1, 0]);

  const d = useMemo(() => {
    const xs = -0.2 * W;
    const xe = 1.2 * W;
    const rows = [0.02, 0.24, 0.46, 0.68, 0.9, 1.08];
    let s = `M${xs} ${rows[0] * H}`;
    rows.forEach((r, i) => {
      if (i === 0) return;
      const fromX = i % 2 ? xs : xe;
      const toX = i % 2 ? xe : xs;
      const y0 = rows[i - 1] * H;
      const y1 = r * H;
      s += ` Q${(fromX + toX) / 2} ${y0 - H * 0.06} ${toX} ${(y0 + y1) / 2}`;
      s += ` L${fromX === xs ? xs : xe} ${y1}`;
    });
    return s;
  }, [W, H]);

  return (
    <section ref={ref} className="paint" style={{ height: 'calc(var(--vh) * 260)' }}>
      <div className="paint-sticky">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
          <defs>
            <filter id="brush" filterUnits="userSpaceOnUse" x={-W * 0.3} y={-H * 0.3} width={W * 1.6} height={H * 1.6}>
              <feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves="2" seed="7" result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale="46" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
          <motion.path d={d} className="brush" strokeWidth={H * 0.3} style={{ pathLength: draw }} filter="url(#brush)" />
          <motion.path d={d} className="brush brush--lead" strokeWidth={H * 0.07} style={{ pathLength: lead }} filter="url(#brush)" />
          <motion.rect width={W} height={H} fill="#fff" style={{ opacity: fill }} />
        </svg>
        <motion.p className="paint-caption" style={{ opacity: caption }}>
          E aí, a luz voltou.
        </motion.p>
      </div>
    </section>
  );
}
