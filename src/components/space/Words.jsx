import { motion, useTransform } from 'framer-motion';
import { intro } from '../../content';
import { clamp, smoothstep } from '../../lib/math';
import { ProximityText } from '../fx';
import { SP } from './phases';

function Line({ item, index, vhPos }) {
  const center = SP.wordsStart + SP.wordsGap * (index + 0.5);
  const u = useTransform(vhPos, (v) => (v - center) / SP.wordsGap);
  const y = useTransform(u, (t) => `${clamp(-t, -1.3, 1.3) * 30}vh`);
  const opacity = useTransform(u, (t) => 1 - smoothstep(0.36, 0.86, Math.abs(t)));
  const filter = useTransform(u, (t) => `blur(${(smoothstep(0.25, 0.9, Math.abs(t)) * 10).toFixed(1)}px)`);
  const scale = useTransform(u, (t) => 1 - clamp(Math.abs(t), 0, 1) * 0.08);
  const visibility = useTransform(u, (t) => (Math.abs(t) > 1.05 ? 'hidden' : 'visible'));
  const p = useTransform(u, (t) => clamp((t + 0.95) / 0.75));
  const dotScale = useTransform(u, (t) => 1 + Math.max(0, -t) * 0.6);

  let body;
  if (item.kind === 'dot') {
    body = <motion.span className="w-dot" style={{ scale: dotScale }} />;
  } else if (item.kind === 'name') {
    body = (
      <>
        <span className="w-pre">{item.pre}</span>
        <span className="w-name">
          <ProximityText text={item.text} min={250} max={900} radius={240} />
        </span>
      </>
    );
  } else if (item.kind === 'xl') {
    body = <ProximityText className="w-xl" text={item.text} min={200} max={900} radius={320} />;
  } else {
    body = <span className={`w-${item.kind}`}>{letters(item.text)}</span>;
  }

  return (
    <motion.div className={`w-line w-line--${item.kind}`} style={{ y, opacity, filter, scale, visibility, '--p': p }}>
      {body}
    </motion.div>
  );
}

function letters(text) {
  return text.split('').map((ch, i) => (
    <span className="wl" key={i} style={{ '--i': i }}>
      {ch === ' ' ? ' ' : ch}
    </span>
  ));
}

export default function Words({ vhPos }) {
  return (
    <div className="words" aria-live="polite">
      {intro.map((item, i) => (
        <Line key={item.id} item={item} index={i} vhPos={vhPos} />
      ))}
    </div>
  );
}
