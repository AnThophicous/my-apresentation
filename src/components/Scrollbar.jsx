import { useEffect, useRef, useState } from 'react';
import { useMotionValueEvent, useScroll } from 'framer-motion';
import { store, useStore } from '../lib/store';
import { scrollToY } from '../lib/scroll';

export default function Scrollbar() {
  const { scrollY } = useScroll();
  const loopY = useStore((s) => s.loopY);
  const H = useStore((s) => s.H);
  const track = useRef(null);
  const thumb = useRef(null);
  const dragging = useRef(false);
  const [marks, setMarks] = useState([]);
  const [active, setActive] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const read = () => {
      const end = store.get().loopY;
      if (!Number.isFinite(end)) return;
      const list = Array.from(document.querySelectorAll('[data-chapter], [data-stage]')).map((el) => ({
        at: Math.min(1, (el.getBoundingClientRect().top + window.scrollY) / end),
        name: el.getAttribute('data-chapter') || '00 · Cosmos',
      }));
      setMarks(list);
    };
    read();
    const id = setInterval(read, 2000);
    return () => clearInterval(id);
  }, [loopY]);

  const paint = (y) => {
    if (!Number.isFinite(loopY) || !thumb.current) return;
    const p = Math.min(1, Math.max(0, y / loopY));
    thumb.current.style.setProperty('--p', p.toFixed(4));
    setHidden(y < H * 0.04 || y > loopY - H * 0.04);
  };
  useMotionValueEvent(scrollY, 'change', paint);
  useEffect(() => paint(scrollY.get()), [loopY, H]);

  const seek = (clientY) => {
    const r = track.current.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
    scrollToY(p * loopY);
  };

  return (
    <div
      className={`sbar ${active ? 'is-active' : ''} ${hidden ? 'is-hidden' : ''}`}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => !dragging.current && setActive(false)}
      data-cursor="arraste"
    >
      <div
        ref={track}
        className="sbar-track"
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          seek(e.clientY);
        }}
        onPointerMove={(e) => dragging.current && seek(e.clientY)}
        onPointerUp={() => {
          dragging.current = false;
          setActive(false);
        }}
      >
        {marks.map((m) => (
          <span key={m.name} className="sbar-mark" style={{ top: `${m.at * 100}%` }} data-name={m.name} />
        ))}
        <span ref={thumb} className="sbar-thumb" />
      </div>
    </div>
  );
}
