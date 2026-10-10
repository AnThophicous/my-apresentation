import { motion } from 'framer-motion';
import { skills } from '../content';
import { ProximityText, RevealLines } from './fx';

const ease = [0.16, 1, 0.3, 1];

function Bar({ s, i }) {
  const delay = 0.25 + i * 0.05;
  if (s.kind === 'wave') {
    let d = 'M0 10';
    for (let x = 0; x <= 400; x += 2.5) {
      const amp = 6 * (0.55 + 0.45 * Math.sin((x * Math.PI * 2) / 200));
      d += ` L${x} ${(10 + Math.sin((x * Math.PI * 2) / (200 / 18)) * amp).toFixed(2)}`;
    }
    return (
      <svg className="bar bar--wave" viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden>
        <motion.g initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay }}>
          <path className="wave-path" d={d} />
        </motion.g>
      </svg>
    );
  }
  const len = s.kind === 'dashed' ? 0.14 : s.months / 48;
  return (
    <svg className={`bar ${s.kind === 'dashed' ? 'bar--dashed' : ''}`} viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden>
      <line className="bar-track" x1="0" y1="10" x2="100" y2="10" />
      <motion.line
        className="bar-fill"
        x1="0"
        y1="10"
        y2="10"
        initial={{ x2: 0 }}
        whileInView={{ x2: len * 100 }}
        viewport={{ once: true, margin: '-10% 0px' }}
        transition={{ duration: 1.4, ease, delay }}
      />
    </svg>
  );
}

export default function Skills() {
  return (
    <section className="section dark skills" data-chapter="01 · Perfil">
      <div className="wrap">
        <header className="sec-head">
          <span className="eyebrow">01 · Perfil</span>
          <h2 className="sec-title">
            <ProximityText text="O que eu sou." min={300} max={850} />
          </h2>
          <RevealLines className="sec-lede" lines={['Não um título.', 'Um conjunto de coisas que eu não consigo parar de fazer.']} />
        </header>
        <ul className="skill-list">
          {skills.map((s, i) => (
            <motion.li
              key={s.name}
              className="skill"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-8% 0px' }}
              transition={{ duration: 0.9, ease, delay: (i % 3) * 0.06 }}
            >
              <span className="skill-i">{String(i + 1).padStart(2, '0')}</span>
              <span className="skill-name">
                {s.name}
                {s.detail && <em>{s.detail}</em>}
              </span>
              <Bar s={s} i={i} />
              <span className="skill-time">{s.time}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
