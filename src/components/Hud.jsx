import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { site } from '../content';
import { store, useStore } from '../lib/store';
import { ambient } from '../lib/audio';
import { Magnetic, Scramble } from './fx';

export default function Hud() {
  const { scrollY } = useScroll();
  const loopY = useStore((s) => s.loopY);
  const H = useStore((s) => s.H);
  const sound = useStore((s) => s.sound);
  const [visible, setVisible] = useState(false);
  const [chapter, setChapter] = useState('');
  const pctRef = useRef(null);
  const tops = useRef([]);

  useEffect(() => {
    const read = () => {
      tops.current = Array.from(document.querySelectorAll('[data-chapter]')).map((el) => ({
        top: el.getBoundingClientRect().top + window.scrollY,
        label: el.getAttribute('data-chapter'),
      }));
    };
    read();
    const id = setInterval(read, 1500);
    window.addEventListener('resize', read);
    return () => {
      clearInterval(id);
      window.removeEventListener('resize', read);
    };
  }, []);

  useMotionValueEvent(scrollY, 'change', (y) => {
    const show = y > H * 0.04 && y < loopY - H * 0.04;
    setVisible(show);
    if (pctRef.current && Number.isFinite(loopY)) {
      pctRef.current.textContent = String(Math.min(100, Math.round((y / loopY) * 100))).padStart(3, '0');
    }
    let label = '';
    for (const t of tops.current) if (y + H * 0.5 >= t.top) label = t.label;
    const stage = document.querySelector('[data-stage]');
    if (stage) {
      const local = (y - (stage.getBoundingClientRect().top + y)) / (H / 100);
      const m = JSON.parse(stage.getAttribute('data-stage'));
      if (local >= 0 && local < m.end) label = local < m.cosmos ? '00 · Puxe' : local < m.words ? '00 · Cosmos' : '00 · Hi.';
    }
    setChapter(label);
  });

  const toggleSound = async () => {
    if (sound) {
      ambient.disable();
      store.set({ sound: false });
    } else {
      await ambient.enable();
      store.set({ sound: true });
    }
  };

  return (
    <motion.div
      className="hud"
      initial={false}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.6 }}
      style={{ pointerEvents: visible ? 'auto' : 'none' }}
    >
      <div className="hud-tl">
        <span className="hud-name">{site.short}</span>
        <span className="hud-dim">Front-end</span>
      </div>
      <div className="hud-tr">
        <Magnetic as="button" className="hud-btn" onClick={toggleSound} data-cursor={sound ? 'silêncio' : 'música'} aria-pressed={sound}>
          <SoundBars on={sound} />
          <span>{sound ? 'som' : 'som off'}</span>
        </Magnetic>
        <Magnetic as="a" className="hud-btn" href={site.github} target="_blank" rel="noreferrer" data-cursor="abrir">
          <Scramble text="GitHub" />
          <span aria-hidden>↗</span>
        </Magnetic>
      </div>
      <div className="hud-bl">
        <motion.span key={chapter} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }}>
          {chapter}
        </motion.span>
      </div>
      <div className="hud-br">
        <span ref={pctRef}>000</span>
        <span className="hud-dim">%</span>
      </div>
    </motion.div>
  );
}

function SoundBars({ on }) {
  return (
    <svg className={`bars ${on ? 'on' : ''}`} width="18" height="14" viewBox="0 0 18 14" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={i * 5} y="0" width="2.4" height="14" rx="1.2" style={{ animationDelay: `${i * -0.23}s` }} />
      ))}
    </svg>
  );
}
