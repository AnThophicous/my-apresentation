import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ropeGeometry, useStore } from '../../lib/store';
import { clamp, easeInOutCubic, easeOutBack, easeOutCubic, lerp, phase } from '../../lib/math';
import { getScrollTarget, scrollToY } from '../../lib/scroll';
import { ambient } from '../../lib/audio';
import { SP } from './phases';

export default function Rope({ vhPos }) {
  const W = useStore((s) => s.W);
  const H = useStore((s) => s.H);
  const touch = useStore((s) => s.touch);
  const g = ropeGeometry(W, H);
  const refs = {
    layer: useRef(null),
    paper: useRef(null),
    curtain: useRef(null),
    clip: useRef(null),
    ropeB: useRef(null),
    ropeW: useRef(null),
    handleB: useRef(null),
    handleW: useRef(null),
    hit: useRef(null),
    hint: useRef(null),
  };
  const [idle, setIdle] = useState(false);
  const [pulled, setPulled] = useState(false);
  const [notice, setNotice] = useState(0);
  const drag = useRef(null);
  const live = useRef({ pull: 0, kick: 0 });

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let prevV = vhPos.get();
    let sway = 0;
    let swayV = 0;
    let mouseX = W / 2;
    let wave = 0;
    let clicked = false;
    const onMove = (e) => (mouseX = e.clientX);
    window.addEventListener('pointermove', onMove, { passive: true });

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const v = vhPos.get();
      const vel = (v - prevV) / Math.max(dt, 1e-3);
      prevV = v;

      const layer = refs.layer.current;
      if (!layer) return;
      if (v > SP.star[0] + 40) {
        if (layer.style.visibility !== 'hidden') layer.style.visibility = 'hidden';
        return;
      }
      layer.style.visibility = 'visible';

      const pull = phase(v, SP.pull, easeInOutCubic);
      live.current.pull = pull;
      const rel = phase(v, SP.release);
      const ret = phase(v, SP.retract, easeInOutCubic);

      if (rel > 0.04 && !clicked) {
        clicked = true;
        ambient.click('switch');
      } else if (rel === 0) clicked = false;

      const dragX = drag.current ? drag.current.dx * 0.35 : 0;
      const target = clamp((mouseX - W / 2) * 0.035, -26, 26) * (1 - rel) + dragX;
      swayV += live.current.kick;
      live.current.kick = 0;
      swayV += (target - sway) * 90 * dt - swayV * 9 * dt + clamp(vel, -400, 400) * 0.02 * Math.sin(now / 160);
      sway += swayV * dt;
      wave += (clamp(Math.abs(vel) / 120, 0, 1) - wave) * 0.08;

      const hx = g.x + sway * (1 - ret);
      const hyPull = lerp(g.L, H * 0.84, pull);
      const hy = lerp(hyPull, H * 0.5, easeOutBack(rel, 1.2));

      const attach = lerp(0, H * 0.55, pull);
      const dip = lerp(0, H * 0.16, pull) * (1 - rel);
      const base = lerp(attach - dip, H * 1.3, easeOutCubic(rel));
      let d = `M0 -10 L${W} -10 `;
      const steps = 40;
      for (let i = steps; i >= 0; i--) {
        const x = (W * i) / steps;
        const k = (x - hx) / (W * 0.16);
        const y = base + dip * Math.exp(-k * k) + Math.sin(x * 0.011 + now / 260) * 14 * wave * (1 - rel) * pull;
        d += `L${x.toFixed(1)} ${Math.max(-10, y).toFixed(1)} `;
      }
      d += 'Z';
      refs.curtain.current.setAttribute('d', d);
      refs.clip.current.setAttribute('d', d);
      refs.paper.current.style.opacity = rel >= 1 ? 0 : 1;
      refs.curtain.current.style.opacity = rel >= 1 ? 0 : 1;

      const top = lerp(0, hy - g.handleR, ret);
      const cx = lerp(g.x, hx, 0.35) + sway * 0.4;
      const rope = `M${g.x} ${top.toFixed(1)} Q${cx.toFixed(1)} ${((top + hy) / 2).toFixed(1)} ${hx.toFixed(1)} ${hy.toFixed(1)}`;
      const ropeOpacity = ret >= 1 ? 0 : 1;
      for (const r of [refs.ropeB, refs.ropeW]) {
        r.current.setAttribute('d', rope);
        r.current.style.opacity = ropeOpacity;
      }

      const fade = 1 - phase(v, [SP.star[0], SP.star[0] + 28]);
      for (const h of [refs.handleB, refs.handleW]) {
        h.current.setAttribute('cx', hx.toFixed(1));
        h.current.setAttribute('cy', hy.toFixed(1));
        h.current.style.opacity = fade;
      }
      refs.hit.current.setAttribute('cx', hx.toFixed(1));
      refs.hit.current.setAttribute('cy', hy.toFixed(1));
      refs.hit.current.style.pointerEvents = ret < 0.95 ? 'auto' : 'none';
      if (refs.hint.current) {
        refs.hint.current.setAttribute('transform', `translate(${(hx + 26).toFixed(1)} ${(hy + 5).toFixed(1)})`);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
    };
  }, [vhPos, W, H, g.x, g.L, g.handleR]);

  useEffect(() => {
    const t = setTimeout(() => setIdle(vhPos.get() < 2), 700);
    const unsub = vhPos.on('change', (v) => {
      setIdle(v < 2);
      setPulled(v >= 2 && v < SP.retract[1]);
    });
    return () => {
      clearTimeout(t);
      unsub();
    };
  }, [vhPos]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(0), 3200);
    return () => clearTimeout(t);
  }, [notice]);

  const onDown = (e) => {
    if (live.current.pull >= 0.98) {
      live.current.kick = (Math.random() > 0.5 ? 1 : -1) * 260;
      setNotice((n) => n + 1);
      return;
    }
    setPulled(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y0: e.clientY, x0: e.clientX, dx: 0, s0: getScrollTarget() };
  };
  const onDrag = (e) => {
    if (!drag.current) return;
    const dy = e.clientY - drag.current.y0;
    drag.current.dx = e.clientX - drag.current.x0;
    const ratio = ((SP.pull[1] - SP.pull[0]) * (H / 100)) / (H * 0.84 - g.L);
    scrollToY(Math.max(0, drag.current.s0 + dy * ratio));
  };
  const onUp = () => (drag.current = null);

  return (
    <>
      <svg ref={refs.layer} className="rope-layer" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <clipPath id="curtain-clip">
            <path ref={refs.clip} />
          </clipPath>
        </defs>
        <rect ref={refs.paper} width={W} height={H} fill="#fff" />
        <path ref={refs.curtain} fill="#000" />
        <path ref={refs.ropeB} className="rope" stroke="#000" strokeWidth={g.width} />
        <circle ref={refs.handleB} r={g.handleR} fill="#000" />
        <g clipPath="url(#curtain-clip)">
          <path ref={refs.ropeW} className="rope" stroke="#fff" strokeWidth={g.width} />
        </g>
        <circle ref={refs.handleW} r={g.handleR} fill="#fff" clipPath="url(#curtain-clip)" />
        <g ref={refs.hint}>
          <g className={`rope-hint ${idle ? 'show' : ''}`}>
            <text x="0" y="0">
              puxe
            </text>
            <path d="M54 -8 l0 10 m-4 -4 l4 4 l4 -4" />
          </g>
        </g>
        <text className={`scroll-hint ${pulled ? 'show' : ''}`} x={W / 2} y={H - 64} textAnchor="middle">
          {touch ? 'Deslize para baixo para interagir' : 'Use o scroll do mouse para interagir'}
        </text>
        <circle
          ref={refs.hit}
          r={34}
          fill="transparent"
          className="rope-hit"
          data-cursor="puxe"
          onPointerDown={onDown}
          onPointerMove={onDrag}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
      </svg>
      <AnimatePresence>
        {notice > 0 && (
          <motion.div
            key={notice}
            className="rope-notice"
            role="status"
            initial={{ opacity: 0, y: 24, scale: 0.92, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -12, filter: 'blur(8px)' }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <span>A corda já fez a parte dela.</span>
            <strong>
              Agora é com o {touch ? 'seu dedo' : 'scroll do mouse'} <i aria-hidden>↓</i>
            </strong>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
