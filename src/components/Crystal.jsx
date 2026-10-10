import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useScroll } from 'framer-motion';
import { tools } from '../content';
import { ambient } from '../lib/audio';
import { setCursorLabel } from './Cursor';
import { ProximityText, RevealLines } from './fx';

const ease = [0.16, 1, 0.3, 1];

export default function Crystal() {
  const section = useRef(null);
  const canvas = useRef(null);
  const [face, setFace] = useState(0);
  const { scrollYProgress } = useScroll({ target: section, offset: ['start end', 'end start'] });
  const tool = tools.items[face];

  useEffect(() => {
    let app = null;
    let cancelled = false;
    const fontReady = document.fonts ? document.fonts.load('800 150px Montserrat') : Promise.resolve();
    fontReady.finally(() =>
      import('../three/crystalScene').then(({ createCrystalScene }) => {
        if (cancelled) return;
        app = createCrystalScene(canvas.current, {
          words: tools.items.map((t) => t.l),
          count: tools.items.length,
          getProgress: () => scrollYProgress.get(),
          onFace: (i) => {
            setFace(i);
            ambient.click('key');
          },
          onPulse: () => ambient.click('switch'),
          onHover: (on) => setCursorLabel(on ? 'gire' : null),
        });
      }),
    );
    return () => {
      cancelled = true;
      setCursorLabel(null);
      if (app) app.dispose();
    };
  }, [scrollYProgress]);

  return (
    <section ref={section} className="section dark crystal-sec" data-chapter={tools.eyebrow}>
      <div className="wrap">
        <header className="sec-head">
          <span className="eyebrow">{tools.eyebrow}</span>
          <h2 className="sec-title">
            <ProximityText text={tools.title} min={300} max={850} />
          </h2>
          <RevealLines className="sec-lede" lines={tools.lede} />
        </header>
      </div>
      <div className="crystal-stage">
        <canvas ref={canvas} className="crystal-canvas" />
        <div className="crystal-caption" aria-live="polite">
          <span className="crystal-index">
            {String(face + 1).padStart(2, '0')} / {String(tools.items.length).padStart(2, '0')}
          </span>
          <AnimatePresence mode="wait">
            <motion.div
              key={tool.l}
              className="crystal-tool"
              initial={{ y: 18, opacity: 0, filter: 'blur(6px)' }}
              animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
              exit={{ y: -14, opacity: 0, filter: 'blur(6px)' }}
              transition={{ duration: 0.35, ease }}
            >
              <strong>{tool.l}</strong>
              <span>{tool.d}</span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
