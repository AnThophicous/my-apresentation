import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useScroll } from 'framer-motion';
import { keyboard } from '../content';
import { ambient } from '../lib/audio';
import { setCursorLabel } from './Cursor';
import { ProximityText, RevealLines } from './fx';

export default function Keyboard() {
  const section = useRef(null);
  const canvas = useRef(null);
  const [active, setActive] = useState(null);
  const [count, setCount] = useState(0);
  const { scrollYProgress } = useScroll({ target: section, offset: ['start end', 'end start'] });

  useEffect(() => {
    let app = null;
    let cancelled = false;
    const fontReady = document.fonts ? document.fonts.load('600 64px Montserrat') : Promise.resolve();
    fontReady.finally(() =>
      import('../three/keyboardScene').then(({ createKeyboardScene }) => {
        if (cancelled) return;
        app = createKeyboardScene(canvas.current, {
          rows: keyboard,
          getProgress: () => scrollYProgress.get(),
          onHover: (k) => {
            setCursorLabel(k ? 'pressione' : null);
            if (k) setActive(k);
          },
          onPress: (k) => {
            ambient.click('key');
            setActive(k);
            setCount((c) => c + 1);
          },
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
    <section ref={section} className="section dark keys-sec" data-chapter="02 · Ferramentas">
      <div className="wrap">
        <header className="sec-head">
          <span className="eyebrow">02 · Ferramentas</span>
          <h2 className="sec-title">
            <ProximityText text="Com o que eu construo." min={300} max={850} />
          </h2>
          <RevealLines className="sec-lede" lines={['Cada tecla é uma ferramenta.', 'Pressione. Elas respondem.']} />
        </header>
      </div>
      <div className="keys-stage">
        <canvas ref={canvas} className="keys-canvas" />
        <div className="keys-caption" aria-live="polite">
          <AnimatePresence mode="wait">
            {active ? (
              <motion.div
                key={active.l}
                className="keys-info"
                initial={{ y: 18, opacity: 0, filter: 'blur(6px)' }}
                animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                exit={{ y: -14, opacity: 0, filter: 'blur(6px)' }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <strong>{active.l}</strong>
                <span>{active.d}</span>
              </motion.div>
            ) : (
              <motion.div
                key="hint"
                className="keys-info keys-info--hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <span>passe o mouse ou toque nas teclas</span>
              </motion.div>
            )}
          </AnimatePresence>
          <span className="keys-count">{String(count).padStart(3, '0')} cliques</span>
        </div>
      </div>
    </section>
  );
}
