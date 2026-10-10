import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { ending, projects, site, timeline, timelineIntro } from '../content';
import { ropeGeometry, store, useStore } from '../lib/store';
import { clamp, lerp, smoothstep } from '../lib/math';
import { buildThread, buildYarn, projectYarn, threadAt } from '../lib/thread';
import { ambient } from '../lib/audio';
import Books from './Books';
import Contact from './Contact';
import DitherImage from './DitherImage';
import { CountUp, Magnetic, ProximityText, RevealLines, Scramble } from './fx';

const ease = [0.16, 1, 0.3, 1];

function Year({ year }) {
  const [k, setK] = useState(0);
  return (
    <motion.span
      className="year"
      initial="hide"
      whileInView="show"
      viewport={{ once: true, margin: '-10% 0px' }}
      onHoverStart={() => setK((v) => v + 1)}
      aria-label={String(year)}
    >
      {String(year)
        .split('')
        .map((d, i) => (
          <span className="year-mask" key={i} aria-hidden>
            <motion.span
              key={k}
              className="year-d"
              variants={{ hide: { y: '105%' }, show: { y: '0%' } }}
              initial={k ? { y: '-105%' } : undefined}
              animate={k ? { y: '0%' } : undefined}
              transition={{ duration: 0.9, ease, delay: i * 0.07 }}
            >
              {d}
            </motion.span>
          </span>
        ))}
    </motion.span>
  );
}

function Stage({ s, i, n, headRef }) {
  return (
    <article className="stage">
      <RevealLines className="stage-q" lines={[s.question]} />
      <div className="stage-head" ref={headRef}>
        <span className="stage-idx">
          {String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
        </span>
        <h3 className="stage-year">
          <Year year={s.year} />
        </h3>
        <span className="stage-age">{s.age} anos</span>
      </div>
      <RevealLines as="h4" className="stage-title" lines={[s.title]} delay={0.1} />
      {s.body &&
        s.body.map((p, k) => (
          <motion.p
            key={k}
            className="stage-body"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.9, ease, delay: 0.15 + k * 0.08 }}
          >
            {p}
          </motion.p>
        ))}
      {s.tags && (
        <ul className="tags">
          {s.tags.map((t, k) => (
            <motion.li
              key={t}
              initial={{ opacity: 0, scale: 0.6 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.25 + k * 0.06 }}
              whileHover={{ y: -4 }}
            >
              {t}
            </motion.li>
          ))}
        </ul>
      )}
      {s.photo && (
        <div className="stage-photo">
          <DitherImage src={s.photo} alt={`${s.year}`} ratio={4 / 5} />
        </div>
      )}
      {s.books && (
        <div className="stage-books">
          <p className="mini">
            <CountUp value={s.booksCount} /> livros estudados
          </p>
          <Books extra={s.booksExtra} />
        </div>
      )}
      {s.counters && (
        <div className="counters">
          {s.counters.map((c) => (
            <div className="counter" key={c.label}>
              <CountUp value={c.value} />
              <span>{c.label}</span>
            </div>
          ))}
        </div>
      )}
      {s.learned && (
        <ul className="learned">
          {s.learned.map((l, k) => (
            <motion.li
              key={l}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease, delay: k * 0.1 }}
            >
              <span>+</span>
              {l}
            </motion.li>
          ))}
        </ul>
      )}
      {s.closing && <RevealLines className="stage-closing" lines={s.closing} />}
    </article>
  );
}

function Projects() {
  return (
    <div className="projects">
      <RevealLines className="projects-title" lines={projects.title} />
      <div className="project-grid">
        {projects.items.map((p, i) => (
          <TiltCard key={p.name} p={p} i={i} />
        ))}
      </div>
      <Magnetic as="a" className="gh-link" href={site.github} target="_blank" rel="noreferrer" strength={0.2} data-cursor="abrir">
        <Scramble text={site.githubLabel} />
        <span aria-hidden>↗</span>
      </Magnetic>
    </div>
  );
}

function TiltCard({ p, i }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.setProperty('--rx', `${(-y * 10).toFixed(2)}deg`);
    ref.current.style.setProperty('--ry', `${(x * 12).toFixed(2)}deg`);
    ref.current.style.setProperty('--gx', `${(x + 0.5) * 100}%`);
    ref.current.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
  };
  const reset = () => {
    ref.current.style.setProperty('--rx', '0deg');
    ref.current.style.setProperty('--ry', '0deg');
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.9, ease, delay: i * 0.1 }}
    >
      <a ref={ref} className="pcard" href={p.url} target="_blank" rel="noreferrer" onPointerMove={onMove} onPointerLeave={reset} data-cursor="ver código">
        <span className="pcard-lang">{p.lang}</span>
        <strong className="pcard-name">{p.name}</strong>
        <span className="pcard-desc">{p.desc}</span>
        <span className="pcard-arrow" aria-hidden>
          ↗
        </span>
      </a>
    </motion.div>
  );
}

export default function Timeline() {
  const sec = useRef(null);
  const headRefs = useRef([]);
  const untangleRef = useRef(null);
  const replicaRef = useRef(null);
  const W = useStore((s) => s.W);
  const H = useStore((s) => s.H);
  const mobile = W < 760;
  const geo = ropeGeometry(W, H);
  const [lay, setLay] = useState(null);
  const yarn = useMemo(() => buildYarn(mobile ? 520 : 760), [mobile]);

  const svgRefs = {
    trail: useRef(null),
    rope: useRef(null),
    clip: useRef(null),
    yarn: useRef(null),
    disc: useRef(null),
  };
  const passed = useRef(new Set());

  const measure = useCallback(() => {
    const el = sec.current;
    if (!el || !W || !H) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const rel = (node) => node.getBoundingClientRect().top + window.scrollY - top;
    const xc = mobile ? 26 : Math.max(56, (W - Math.min(W, 1240)) / 2 + 96);
    const y0 = -H / 2;
    const yLoopTop = rel(replicaRef.current);
    const yEnd = yLoopTop + geo.L;
    const yCenterEnd = yLoopTop - H * 0.2;
    const yCenterStart = yCenterEnd - H * 0.75;
    const yUntangled = Math.min(rel(untangleRef.current), yCenterStart - 10);
    const thread = buildThread({ W, H, xc, y0, yUntangled, yCenterStart, yCenterEnd, yEnd, mobile });
    const nodes = headRefs.current.filter(Boolean).map((h) => {
      const y = rel(h) + h.offsetHeight * 0.5;
      return { y, ...threadAt(thread, y) };
    });
    const tw = mobile ? 1.6 : 2;
    const yR0 = yCenterEnd - H * 0.1;
    let left = '';
    let right = '';
    for (let y = yR0; y <= yEnd + 0.5; y += 6) {
      const w = lerp(tw, geo.width, smoothstep(yR0, yLoopTop - H * 0.05, y)) / 2;
      left += `${left ? 'L' : 'M'}${(W / 2 - w).toFixed(2)} ${y.toFixed(1)}`;
      right = `L${(W / 2 + w).toFixed(2)} ${y.toFixed(1)}` + right;
    }
    store.set({ loopY: top + yLoopTop });
    setLay({ top, y0, yEnd, yLoopTop, thread, nodes, rope: `${left}${right}Z`, height: el.offsetHeight, tw });
  }, [W, H, mobile, geo.L, geo.width]);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(document.body);
    if (document.fonts) document.fonts.ready.then(measure);
    return () => ro.disconnect();
  }, [measure]);

  const { scrollY } = useScroll();
  const update = useCallback(
    (y) => {
      if (!lay) return;
      const { top, y0, yEnd, thread, nodes } = lay;
      const by = y + H / 2 - top;
      if (by < y0 - H * 1.2 || by > yEnd + H * 2) return;
      const appear = smoothstep(y0 - H * 0.45, y0 - H * 0.02, by);
      const byc = Math.min(by, yEnd);
      const pt = by < y0 ? { x: W / 2, y: by, len: 0 } : threadAt(thread, byc);
      const prog = clamp((byc - y0) / (yEnd - y0));

      svgRefs.trail.current.style.strokeDashoffset = String(thread.total - pt.len);
      svgRefs.clip.current.setAttribute('height', String(Math.max(0, pt.y + H)));

      const r0 = mobile ? 30 : 84;
      const r = geo.handleR + (r0 - geo.handleR) * Math.pow(1 - prog, 1.1);
      const frac = appear * Math.pow(1 - prog, 0.85);
      const yarnEl = svgRefs.yarn.current;
      yarnEl.setAttribute('d', projectYarn(yarn, pt.x, pt.y, r, by * 0.004, by * 0.0065));
      yarnEl.style.strokeDasharray = `${frac.toFixed(4)} 1`;
      yarnEl.style.opacity = String(1 - smoothstep(0.9, 0.99, prog));
      const disc = svgRefs.disc.current;
      disc.setAttribute('cx', pt.x.toFixed(1));
      disc.setAttribute('cy', pt.y.toFixed(1));
      disc.style.opacity = String(smoothstep(0.86, 0.99, prog));

      const nodeEls = sec.current.querySelectorAll('.node');
      nodes.forEach((nd, i) => {
        if (by >= nd.y && !passed.current.has(i)) {
          passed.current.add(i);
          ambient.pluck(i);
          nodeEls[i]?.classList.add('is-on');
        } else if (by < nd.y - 40 && passed.current.has(i)) {
          passed.current.delete(i);
          nodeEls[i]?.classList.remove('is-on');
        }
      });
      ambient.setScene({ brightness: 0.75, hole: 0, wind: 0 });
    },
    [lay, W, H, mobile, yarn, geo.handleR, geo.L],
  );
  useMotionValueEvent(scrollY, 'change', update);
  useEffect(() => update(scrollY.get()), [update, scrollY]);

  return (
    <section ref={sec} className="section light timeline" data-chapter="04 · A linha">
      {lay && (
        <svg className="thread-svg" width={W} height={lay.height} viewBox={`0 0 ${W} ${lay.height}`} aria-hidden>
          <defs>
            <clipPath id="rope-clip">
              <rect ref={svgRefs.clip} x="0" y={-H} width={W} height="0" />
            </clipPath>
          </defs>
          <path
            ref={svgRefs.trail}
            d={lay.thread.d}
            className="trail"
            strokeWidth={lay.tw}
            style={{ strokeDasharray: lay.thread.total, strokeDashoffset: lay.thread.total }}
          />
          <path ref={svgRefs.rope} d={lay.rope} className="rope-fill" clipPath="url(#rope-clip)" />
          {lay.nodes.map((nd, i) => (
            <g key={i} className="node" transform={`translate(${nd.x.toFixed(1)} ${nd.y.toFixed(1)})`}>
              <circle className="node-ring" r="16" />
              <circle className="node-dot" r="5" />
            </g>
          ))}
          <path ref={svgRefs.yarn} className="yarn" pathLength="1" strokeWidth={mobile ? 1.3 : 1.6} />
          <circle ref={svgRefs.disc} r={geo.handleR} className="disc" />
        </svg>
      )}

      <div className="tl-content">
        <div className="tl-intro">
          <span className="eyebrow">{timelineIntro.eyebrow}</span>
          <h2 className="tl-ask">
            <ProximityText text={timelineIntro.question} min={300} max={800} />
          </h2>
          <RevealLines className="tl-lede" lines={timelineIntro.lede} />
        </div>

        {timeline.map((s, i) => (
          <Stage key={s.year} s={s} i={i} n={timeline.length} headRef={(el) => (headRefs.current[i] = el)} />
        ))}
        <div ref={untangleRef} />

        <Projects />
        <Contact />
      </div>

      <div className="ending">
          <RevealLines className="end-q" lines={[ending.question]} />
          <motion.p
            className="end-a"
            initial={{ opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-30% 0px' }}
            transition={{ type: 'spring', stiffness: 200, damping: 12 }}
          >
            {ending.answer}
          </motion.p>
          <RevealLines className="end-note" lines={ending.note} />
      </div>
            <div ref={replicaRef} className="replica" style={{ height: H }} />
      <div className="replica-tail" />
    </section>
  );
}
