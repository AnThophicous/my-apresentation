import { motion, useSpring } from 'framer-motion';
import { books } from '../content';
import DitherImage from './DitherImage';

function Book({ b, i }) {
  const ry = useSpring(30, { stiffness: 160, damping: 18 });
  const lift = useSpring(0, { stiffness: 260, damping: 20 });
  const w = 'var(--book-w)';
  return (
    <motion.div
      className="book"
      style={{ '--ratio': b.ratio, '--thick': `${b.thick}px`, y: lift }}
      initial={{ opacity: 0, y: 60, rotate: -6 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, margin: '-5% 0px' }}
      transition={{ type: 'spring', stiffness: 90, damping: 14, delay: i * 0.06 }}
      onHoverStart={() => {
        ry.set(6);
        lift.set(-16);
      }}
      onHoverEnd={() => {
        ry.set(30);
        lift.set(0);
      }}
      onPan={(_, info) => ry.set(6 + info.offset.x * 0.6)}
      onPanEnd={() => ry.set(6)}
      data-cursor="gire"
    >
      <motion.div className="book-3d" style={{ rotateY: ry, width: w }}>
        <div className="book-front">
          <DitherImage src={`${import.meta.env.BASE_URL}img/out/${b.slug}.webp`} alt={`${b.title}, ${b.author}`} ratio={b.ratio} dot={1.5} lens={70} />
        </div>
        <div className="book-spine">
          <span>{b.title}</span>
        </div>
        <div className="book-pages" />
        <div className="book-back" />
      </motion.div>
      <div className="book-meta">
        <strong>{b.title}</strong>
        <span>{b.author}</span>
      </div>
    </motion.div>
  );
}

export default function Books({ extra }) {
  return (
    <div className="shelf">
      {books.map((b, i) => (
        <Book key={b.slug} b={b} i={i} />
      ))}
      <motion.div
        className="book book--more"
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 90, damping: 14, delay: books.length * 0.06 }}
      >
        <div className="more-stack" aria-hidden>
          {[0, 1, 2, 3, 4].map((k) => (
            <span key={k} style={{ '--k': k }} />
          ))}
        </div>
        <div className="book-meta">
          <strong>+{extra}</strong>
          <span>e a lista continua</span>
        </div>
      </motion.div>
    </div>
  );
}
