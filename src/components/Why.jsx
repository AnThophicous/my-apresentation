import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { why } from '../content';
import DitherImage from './DitherImage';
import { useStore } from '../lib/store';
import { RevealLines } from './fx';

function Word({ word, i, n, progress, emphasis }) {
  const start = 0.12 + (i / n) * 0.7;
  const opacity = useTransform(progress, [start, start + 0.05], [0.12, 1]);
  const y = useTransform(progress, [start, start + 0.05], [8, 0]);
  const draw = useTransform(progress, [start + 0.03, start + 0.1], [0, 1]);
  return (
    <motion.span className={`mw ${emphasis ? 'mw--em' : ''}`} style={{ opacity, y }}>
      {word}
      {emphasis && (
        <svg className="mw-line" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden>
          <motion.path d="M2 6 C 30 2, 60 9, 98 4" style={{ pathLength: draw }} />
        </svg>
      )}{' '}
    </motion.span>
  );
}

function Manifesto() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const words = why.text.split(' ');
  const qOpacity = useTransform(scrollYProgress, [0, 0.06, 0.14, 0.2], [0, 1, 1, 0.15]);
  const qY = useTransform(scrollYProgress, [0, 0.2], [40, -20]);
  return (
    <div ref={ref} className="manifesto" style={{ height: 'calc(var(--vh) * 280)' }}>
      <div className="manifesto-sticky">
        <span className="eyebrow">{why.eyebrow}</span>
        <motion.p className="manifesto-q" style={{ opacity: qOpacity, y: qY }}>
          {why.question}
        </motion.p>
        <p className="manifesto-text">
          {words.map((w, i) => (
            <Word key={i} word={w} i={i} n={words.length} progress={scrollYProgress} emphasis={why.emphasis.includes(w)} />
          ))}
        </p>
      </div>
    </div>
  );
}

function PhotoTable() {
  const table = useRef(null);
  const touch = useStore((s) => s.touch);
  return (
    <div className="phototable-wrap">
      <div className="wrap">
        <RevealLines className="pt-title" lines={why.historyTitle} />
      </div>
      <div ref={table} className="phototable" data-cursor={touch ? undefined : 'arraste'}>
        {why.history.map((p, i) => (
          <motion.figure
            key={p.slug}
            className={`photo photo--${i}`}
            drag={!touch}
            dragConstraints={table}
            dragElastic={0.18}
            dragTransition={{ bounceStiffness: 300, bounceDamping: 18 }}
            whileDrag={{ scale: 1.05, rotate: 0, zIndex: 20, cursor: 'grabbing' }}
            whileHover={{ scale: 1.02 }}
            initial={{ opacity: 0, y: 120, rotate: p.rotate * 2.2 }}
            whileInView={{ opacity: 1, y: 0, rotate: p.rotate }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ type: 'spring', stiffness: 70, damping: 16, delay: i * 0.12 }}
          >
            <DitherImage src={`${import.meta.env.BASE_URL}img/out/${p.slug}.webp`} alt={p.alt} ratio={p.ratio} dot={2} />
            <figcaption>
              <span className="photo-year">{p.year}</span>
              <span className="photo-title">{p.title}</span>
              <span className="photo-cap">{p.caption}</span>
            </figcaption>
          </motion.figure>
        ))}
      </div>
      <p className="credits">Fotos em domínio público, NASA, U.S. Army, U.S. Naval History and Heritage Command, via Wikimedia Commons.</p>
    </div>
  );
}

export default function Why() {
  return (
    <section className="section dark why" data-chapter="03 · Por quê">
      <Manifesto />
      <PhotoTable />
    </section>
  );
}
