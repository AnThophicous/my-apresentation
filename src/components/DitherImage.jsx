import { useEffect, useRef, useState } from 'react';

const INK = [10, 10, 10];
const PAPER = [242, 242, 242];

export default function DitherImage({ src, alt = '', ratio, dot = 2, ink = INK, paper = PAPER, className = '', lens = 120 }) {
  const wrap = useRef(null);
  const canvas = useRef(null);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    const draw = () => {
      if (cancelled || !wrap.current) return;
      const w = Math.max(40, Math.round(wrap.current.clientWidth / dot));
      const h = Math.round(w / (ratio || img.naturalWidth / img.naturalHeight));
      const c = canvas.current;
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      const ir = img.naturalWidth / img.naturalHeight;
      const cr = w / h;
      let sw = img.naturalWidth;
      let sh = img.naturalHeight;
      if (ir > cr) sw = sh * cr;
      else sh = sw / cr;
      ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h);
      const px = data.data;
      const g = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) {
        const l = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;
        g[i] = Math.pow(l, 0.9) * 1.08 - 0.02;
      }
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          const v = g[i] > 0.5 ? 1 : 0;
          const e = g[i] - v;
          g[i] = v;
          if (x + 1 < w) g[i + 1] += (e * 7) / 16;
          if (y + 1 < h) {
            if (x > 0) g[i + w - 1] += (e * 3) / 16;
            g[i + w] += (e * 5) / 16;
            if (x + 1 < w) g[i + w + 1] += (e * 1) / 16;
          }
        }
      }
      for (let i = 0; i < w * h; i++) {
        const col = g[i] > 0.5 ? paper : ink;
        px[i * 4] = col[0];
        px[i * 4 + 1] = col[1];
        px[i * 4 + 2] = col[2];
        px[i * 4 + 3] = 255;
      }
      ctx.putImageData(data, 0, 0);
      setReady(true);
    };
    img.onload = draw;
    const ro = new ResizeObserver(() => img.complete && img.naturalWidth && draw());
    ro.observe(wrap.current);
    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, [src, ratio, dot, ink.join(), paper.join()]);

  const onMove = (e) => {
    const r = wrap.current.getBoundingClientRect();
    wrap.current.style.setProperty('--mx', `${e.clientX - r.left}px`);
    wrap.current.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  return (
    <div
      ref={wrap}
      className={`dither ${ready ? 'is-ready' : ''} ${hover ? 'is-hover' : ''} ${className}`}
      style={{ aspectRatio: ratio, '--lens': `${lens}px` }}
      onPointerMove={onMove}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      role="img"
      aria-label={alt}
    >
      <canvas ref={canvas} />
      <img className="dither-color" src={src} alt="" draggable={false} loading="lazy" />
    </div>
  );
}
