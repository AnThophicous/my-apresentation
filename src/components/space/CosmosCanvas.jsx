import { useEffect, useRef } from 'react';
import { ropeGeometry, store } from '../../lib/store';
import { easeInCubic, easeInOutCubic, easeOutCubic, lerp, phase } from '../../lib/math';
import { ambient } from '../../lib/audio';
import { FRAG, VERT } from './cosmos.glsl.js';
import { SP } from './phases';

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

export default function CosmosCanvas({ vhPos }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    if (!gl) return;
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const u = {};
    ['uRes', 'uTime', 'uStar', 'uThrow', 'uZoom', 'uReveal', 'uFall', 'uDither', 'uCoreR', 'uMouse'].forEach(
      (n) => (u[n] = gl.getUniformLocation(prog, n)),
    );

    let scale = Math.min(1, (window.devicePixelRatio || 1) * 0.5);
    let w = 0;
    let h = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = Math.max(2, Math.floor(r.width * scale));
      h = Math.max(2, Math.floor(r.height * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
    const onMove = (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);

    let raf = 0;
    let wasActive = false;
    let slow = 0;
    let lastT = performance.now();
    let lastAudio = 0;
    const t0 = performance.now();

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const v = vhPos.get();
      const active = visible && v > SP.star[0] - 4 && v < SP.fall[1] + 6;
      if (!active) {
        if (wasActive) {
          gl.clearColor(0, 0, 0, 1);
          gl.clear(gl.COLOR_BUFFER_BIT);
          wasActive = false;
        }
        lastT = now;
        return;
      }
      wasActive = true;

      const dt = now - lastT;
      lastT = now;
      if (dt > 26) slow++;
      else slow = Math.max(0, slow - 1);
      if (slow > 40 && scale > 0.3) {
        scale *= 0.8;
        slow = 0;
        resize();
      }

      mouse.sx += (mouse.x - mouse.sx) * 0.04;
      mouse.sy += (mouse.y - mouse.sy) * 0.04;

      const { W, H } = store.get();
      const coreR = ropeGeometry(W, H).handleR / H;
      const star = phase(v, SP.star, easeOutCubic);
      const thr = phase(v, SP.throw);
      const zoom = phase(v, SP.zoom, (t) => Math.pow(t, 1.5));
      const reveal = phase(v, SP.reveal, easeInOutCubic);
      const fall = phase(v, SP.fall);
      const dither = 0.4 - 0.2 * phase(v, SP.zoom) + 0.5 * phase(v, SP.reveal);

      gl.uniform2f(u.uRes, w, h);
      gl.uniform1f(u.uTime, (now - t0) / 1000);
      gl.uniform1f(u.uStar, star);
      gl.uniform1f(u.uThrow, thr);
      gl.uniform1f(u.uZoom, zoom);
      gl.uniform1f(u.uReveal, reveal);
      gl.uniform1f(u.uFall, fall);
      gl.uniform1f(u.uDither, Math.min(0.95, dither));
      gl.uniform1f(u.uCoreR, coreR);
      gl.uniform2f(u.uMouse, mouse.sx, mouse.sy);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (now - lastAudio > 120) {
        lastAudio = now;
        ambient.setScene({
          brightness: 0.15 + star * 0.2 + zoom * 0.6 - fall * 0.5,
          hole: reveal * (0.4 + easeInCubic(fall) * 0.6) * (1 - phase(v, [SP.fall[1] - 40, SP.fall[1]])),
          wind: thr * (1 - zoom),
        });
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteVertexArray(vao);
    };
  }, [vhPos]);

  return <canvas ref={canvasRef} className="cosmos-canvas" aria-hidden />;
}
