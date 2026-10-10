import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const ICE_IOR = 1.31;
const UP = new THREE.Vector3(0, 1, 0);

function random(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function jitter(geometry, amount, seed) {
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = Math.sin(v.x * 12.9898 + v.y * 78.233 + v.z * 37.719 + seed) * 43758.5453;
    const n = k - Math.floor(k) - 0.5;
    const r = Math.hypot(v.x, v.z);
    if (r > 1e-4) {
      v.x += (v.x / r) * n * amount;
      v.z += (v.z / r) * n * amount;
    }
    v.y += n * amount * 0.6;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  return geometry;
}

function crystal({ radius, length, tip, seed }) {
  const twist = (seed % 6) * 0.17;
  const body = new THREE.CylinderGeometry(radius * 0.92, radius, length, 6, 1, true).translate(0, length / 2, 0);
  const top = new THREE.ConeGeometry(radius * 0.92, tip, 6, 1, true).translate(0, length + tip / 2, 0);
  const base = new THREE.ConeGeometry(radius, tip * 0.35, 6, 1, true).rotateX(Math.PI).translate(0, -tip * 0.175, 0);
  const merged = mergeGeometries([body, top, base].map((g) => g.toNonIndexed()));
  merged.rotateY(twist);
  return jitter(merged, radius * 0.12, seed);
}

function buildCluster() {
  const rnd = random(11);
  const parts = [crystal({ radius: 0.62, length: 2.5, tip: 1.05, seed: 1 })];
  const dirs = 11;
  for (let i = 0; i < dirs; i++) {
    const down = i > 8;
    const polar = down ? Math.PI - (0.35 + rnd() * 0.5) : 0.28 + rnd() * 0.95;
    const azimuth = (i / dirs) * Math.PI * 2 + rnd() * 0.5;
    const dir = new THREE.Vector3(Math.sin(polar) * Math.cos(azimuth), Math.cos(polar), Math.sin(polar) * Math.sin(azimuth));
    const scale = down ? 0.55 : 0.45 + rnd() * 0.55;
    const g = crystal({ radius: 0.16 + rnd() * 0.24 * scale, length: 0.7 + rnd() * 1.5 * scale, tip: 0.35 + rnd() * 0.45, seed: i + 2 });
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir));
    g.translate(dir.x * 0.18, dir.y * 0.18 - 0.1, dir.z * 0.18);
    parts.push(g);
  }
  const cluster = mergeGeometries(parts);
  cluster.computeVertexNormals();
  cluster.computeBoundingBox();
  const center = cluster.boundingBox.getCenter(new THREE.Vector3());
  cluster.translate(-center.x, -center.y, -center.z);
  return cluster;
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  g.addColorStop(0, '#4a4a4a');
  g.addColorStop(0.35, '#191919');
  g.addColorStop(0.75, '#000');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const ROW_HEIGHT = 256;
const ROW_GAP = 90;

function typeTexture(words, outline) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const font = `${outline ? 300 : 800} 150px Montserrat, sans-serif`;
  ctx.font = font;
  const widths = words.map((w) => ctx.measureText(w).width + ROW_GAP);
  c.width = Math.ceil(widths.reduce((sum, w) => sum + w, 0));
  c.height = ROW_HEIGHT;
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  let x = ROW_GAP / 2;
  words.forEach((word, i) => {
    if (outline && i % 2) ctx.strokeText(word, x, 132);
    else ctx.fillText(word, x, 132);
    x += widths[i];
  });
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function createCrystalScene(canvas, { words, count, onFace, onPulse, onHover, getProgress }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 1.6;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 9.5);

  const glow = new THREE.Mesh(new THREE.PlaneGeometry(30, 18), new THREE.MeshBasicMaterial({ map: glowTexture(), toneMapped: false }));
  glow.position.z = -6;
  scene.add(glow);

  const ROWS = 5;
  const perRow = Math.ceil(words.length / ROWS);
  const rows = Array.from({ length: ROWS }, (_, r) => {
    const own = words.slice(r * perRow, r * perRow + perRow);
    const tex = typeTexture(r % 2 ? own.reverse() : own, r % 2 === 1);
    tex.repeat.set(26 / 1.6 / (tex.image.width / ROW_HEIGHT), 1);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 1.6),
      new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.4, toneMapped: false }),
    );
    mesh.position.set(0, (r - 2) * 1.75, -4);
    scene.add(mesh);
    return { mesh, tex, speed: (r % 2 ? -1 : 1) * (0.006 + r * 0.0015) };
  });

  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.02,
    transmission: 1,
    thickness: 0.9,
    ior: ICE_IOR,
    specularIntensity: 1,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    attenuationColor: new THREE.Color(0xeef6ff),
    attenuationDistance: 14,
    envMapIntensity: 2,
  });
  const ice = new THREE.Mesh(buildCluster(), material);
  const holder = new THREE.Group();
  holder.add(ice);
  scene.add(holder);

  const spark = new THREE.PointLight(0xffffff, 0, 12, 1.4);
  spark.position.set(0, 0, 4);
  scene.add(spark);
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-4, 6, 5);
  scene.add(key);

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = 9.5 * Math.max(1, 1.1 / camera.aspect);
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2(9, 9);
  const state = { dragging: false, moved: 0, lastX: 0, lastY: 0, vYaw: 0.25, vPitch: 0, yaw: 0, pulse: 0, hover: false, hoverK: 0 };
  let face = -1;

  const pickIce = () => {
    ray.setFromCamera(ndc, camera);
    return ray.intersectObject(ice, false).length > 0;
  };

  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    if (state.dragging) {
      const dx = e.clientX - state.lastX;
      const dy = e.clientY - state.lastY;
      state.moved += Math.abs(dx) + Math.abs(dy);
      state.vYaw = dx * 0.35;
      state.vPitch = dy * 0.35;
      state.lastX = e.clientX;
      state.lastY = e.clientY;
    }
  };
  const onDown = (e) => {
    if (!pickIce()) return;
    state.dragging = true;
    state.moved = 0;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  };
  const onUp = () => {
    if (state.dragging && state.moved < 6) {
      state.pulse = 1;
      state.vYaw += 6;
      onPulse && onPulse();
    }
    state.dragging = false;
  };
  const onLeave = () => ndc.set(9, 9);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', onLeave);

  let visible = false;
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
  io.observe(canvas);

  const home = new THREE.Vector3(0, 0, 4);
  const aim = new THREE.Vector3();
  const qYaw = new THREE.Quaternion();
  const qPitch = new THREE.Quaternion();
  const X = new THREE.Vector3(1, 0, 0);
  let raf = 0;
  let last = performance.now();

  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    if (!visible) {
      last = now;
      return;
    }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const p = getProgress();

    if (!state.dragging) {
      state.vYaw += (0.25 - state.vYaw) * (1 - Math.pow(0.04, dt));
      state.vPitch *= Math.pow(0.02, dt);
    }
    const yawStep = state.vYaw * dt;
    state.yaw += yawStep;
    qYaw.setFromAxisAngle(UP, yawStep);
    qPitch.setFromAxisAngle(X, state.vPitch * dt);
    ice.quaternion.premultiply(qYaw).premultiply(qPitch);

    const next = ((Math.floor(state.yaw / ((Math.PI * 2) / count)) % count) + count) % count;
    if (next !== face) {
      face = next;
      onFace && onFace(face);
    }

    const hovering = !state.dragging && pickIce();
    if (hovering !== state.hover) {
      state.hover = hovering;
      onHover && onHover(hovering);
    }
    state.hoverK += ((state.hover || state.dragging ? 1 : 0) - state.hoverK) * (1 - Math.pow(0.002, dt));
    state.pulse *= Math.pow(0.03, dt);

    const enter = Math.min(1, Math.max(0, (p - 0.1) / 0.35));
    const e = 1 - Math.pow(1 - enter, 3);
    const scale = (0.75 + 0.25 * e) * (1 + state.hoverK * 0.04 + Math.sin(state.pulse * Math.PI) * 0.08);
    holder.scale.setScalar(scale);
    holder.position.y = -1.6 * (1 - e) + Math.sin(now / 1400) * 0.08;
    holder.rotation.z = (1 - e) * 0.5;

    rows.forEach((row, i) => {
      row.tex.offset.x += row.speed * dt * 6 * (1 + state.hoverK);
      row.mesh.position.x = (p - 0.5) * (i % 2 ? 3 : -3);
    });

    const away = ndc.x > 2;
    if (away) aim.copy(home);
    else aim.set(ndc.x * 4, ndc.y * 2.4, 3.5);
    spark.position.lerp(aim, 1 - Math.pow(0.001, dt));
    spark.intensity += ((away ? 8 : 34) + state.pulse * 120 - spark.intensity) * (1 - Math.pow(0.01, dt));

    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);

  return {
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (o.material.map) o.material.map.dispose();
          o.material.dispose();
        }
      });
      scene.environment.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
