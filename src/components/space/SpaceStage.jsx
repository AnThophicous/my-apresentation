import { useRef } from 'react';
import { useScroll, useTransform } from 'framer-motion';
import CosmosCanvas from './CosmosCanvas';
import Rope from './Rope';
import Words from './Words';
import { SP, STAGE_SCROLL } from './phases';

export default function SpaceStage() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const vhPos = useTransform(scrollYProgress, (p) => p * STAGE_SCROLL);

  return (
    <section
      ref={ref}
      className="space"
      style={{ height: `calc(var(--vh) * ${STAGE_SCROLL + 100})` }}
      data-stage={JSON.stringify({ cosmos: SP.star[0], words: SP.wordsStart, end: STAGE_SCROLL })}
    >
      <div className="space-sticky">
        <CosmosCanvas vhPos={vhPos} />
        <Words vhPos={vhPos} />
        <Rope vhPos={vhPos} />
      </div>
    </section>
  );
}
