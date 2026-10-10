import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const KEY_H = 0.6;
const KEY_D = 0.92;
const GAP = 0.1;
const ROW_Z = [-1.65, -0.55, 0.55, 1.65];

function keycapGeometry(w) {
  const g = new RoundedBoxGeometry(w, KEY_H, KEY_D, 4, 0.13);
  const pos = g.attributes.position;
  const hw = w / 2;
  const hd = KEY_D / 2;
  const taper = 0.075;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const t = (y + KEY_H / 2) / KEY_H;
    const nx = x * (1 - (taper * t) / hw);
    const nz = z * (1 - (taper * 1.3 * t) / hd) - 0.035 * t;
    let ny = y;
    if (t > 0.97) ny -= 0.035 * (1 - Math.pow(nx / (hw - taper), 2));
    pos.setXYZ(i, nx, ny, nz);
  }
  g.computeVertexNormals();
  return g;
}

function legendTexture(label, w, dark) {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = Math.round(S * w);
  c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#fff';
  let size = label === 'space' ? 58 : 66;
  ctx.font = `600 ${size}px Montserrat, sans-serif`;
  const max = c.width - 70;
  while (ctx.measureText(label).width > max && size > 30) {
    size -= 2;
    ctx.font = `600 ${size}px Montserrat, sans-serif`;
  }
  ctx.textBaseline = 'top';
  if (label === 'space') {
    ctx.textAlign = 'center';
    ctx.fillText(label, c.width / 2, S / 2 - size / 2);
  } else {
    ctx.fillText(label, 40, 46);
    if (dark) ctx.fillRect(40, S - 70, 36, 8);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

function cableGeometry() {
  const pts = [];
  pts.push(new THREE.Vector3(3.6, -0.05, -2.45));
  pts.push(new THREE.Vector3(3.7, -0.2, -3.1));
  const coilStart = new THREE.Vector3(3.9, -0.35, -3.6);
  const turns = 9;
  for (let i = 0; i <= turns * 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const k = i / (turns * 16);
    pts.push(new THREE.Vector3(coilStart.x + k * 2.6 + Math.cos(a) * 0.16, coilStart.y + Math.sin(a) * 0.16, coilStart.z - k * 1.6));
  }
  pts.push(new THREE.Vector3(7.5, -0.4, -6));
  pts.push(new THREE.Vector3(10, -0.5, -9));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.2);
  return new THREE.TubeGeometry(curve, 900, 0.05, 8, false);
}

const DITHER_FRAG = `
uniform sampler2D tDiffuse;
uniform float uCell;
uniform float uLevels;
varying vec2 vUv;
float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(.5, a.y * .75))); }
float bayer4(vec2 a) { return bayer2(.5 * a) * .25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(.5 * a) * .25 + bayer2(a); }
void main() {
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  float l = dot(c, vec3(.2126, .7152, .0722));
  l = 1. - exp(-l * 2.4);
  l = pow(l, .85);
  float n = uLevels - 1.;
  float q = floor(clamp(l, 0., 1.) * n + bayer8(gl_FragCoord.xy / uCell)) / n;
  gl_FragColor = vec4(mix(vec3(.0), vec3(.96), q), 1.);
}`;

export function createKeyboardScene(canvas, { rows, onHover, onPress, getProgress }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(dpr);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  camera.position.set(0, 11, 13);
  camera.lookAt(0, -0.4, 0.3);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x111111, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-6, 11, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -9;
  key.shadow.camera.right = 9;
  key.shadow.camera.top = 9;
  key.shadow.camera.bottom = -9;
  key.shadow.radius = 5;
  key.shadow.bias = -0.0006;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.1);
  rim.position.set(8, 3, -7);
  scene.add(rim);
  const torch = new THREE.PointLight(0xffffff, 0, 7, 1.6);
  torch.position.set(0, 2.2, 0);
  scene.add(torch);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.62;
  ground.receiveShadow = true;
  scene.add(ground);

  const board = new THREE.Group();
  scene.add(board);

  const caseMesh = new THREE.Mesh(
    new RoundedBoxGeometry(10.95, 0.62, 4.95, 6, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x232323, roughness: 0.45, metalness: 0.35 }),
  );
  caseMesh.position.y = -0.31;
  caseMesh.castShadow = true;
  caseMesh.receiveShadow = true;
  board.add(caseMesh);
  const plate = new THREE.Mesh(
    new RoundedBoxGeometry(10.55, 0.1, 4.55, 4, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x0e0e0e, roughness: 0.8 }),
  );
  plate.position.y = 0.01;
  plate.receiveShadow = true;
  board.add(plate);

  const cable = new THREE.Mesh(cableGeometry(), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.2 }));
  cable.castShadow = true;
  board.add(cable);

  const capLight = new THREE.MeshStandardMaterial({ color: 0xe9e9e9, roughness: 0.55 });
  const capDark = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.5 });
  const geoCache = new Map();
  const keys = [];
  rows.forEach((row, r) => {
    let x = -5;
    row.forEach((k) => {
      const w = k.w - GAP;
      if (!geoCache.has(w)) geoCache.set(w, keycapGeometry(w));
      const group = new THREE.Group();
      const cap = new THREE.Mesh(geoCache.get(w), k.dark ? capDark : capLight);
      cap.castShadow = true;
      cap.receiveShadow = true;
      group.add(cap);
      const tex = legendTexture(k.l, k.w, k.dark);
      const legend = new THREE.Mesh(
        new THREE.PlaneGeometry(w - 0.24, KEY_D - 0.3),
        new THREE.MeshStandardMaterial({
          color: k.dark ? 0xf2f2f2 : 0x111111,
          alphaMap: tex,
          transparent: true,
          roughness: 0.6,
          polygonOffset: true,
          polygonOffsetFactor: -2,
        }),
      );
      legend.rotation.x = -Math.PI / 2;
      legend.position.set(0, KEY_H / 2 - 0.02, -0.035);
      group.add(legend);
      const baseY = KEY_H / 2 + 0.06;
      group.position.set(x + k.w / 2, baseY, ROW_Z[r]);
      board.add(group);
      cap.userData.key = keys.length;
      keys.push({ ...k, group, cap, baseY, off: 0, vel: 0, target: 0, pressedUntil: 0 });
      x += k.w;
    });
  });

  const rt = new THREE.WebGLRenderTarget(2, 2, { samples: 4, type: THREE.HalfFloatType });
  const post = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: rt.texture }, uCell: { value: 2 * dpr }, uLevels: { value: 3 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: DITHER_FRAG,
  });
  const postScene = new THREE.Scene();
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.set(0, 11 * Math.max(1, 1.25 / camera.aspect), 13 * Math.max(1, 1.25 / camera.aspect));
    camera.lookAt(0, -0.4, 0.3);
    camera.updateProjectionMatrix();
    const v = new THREE.Vector2();
    renderer.getDrawingBufferSize(v);
    rt.setSize(v.x, v.y);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2(-9, -9);
  const mouse = { x: 0, y: 0, sx: 0, sy: 0, inside: false };
  let hovered = -1;
  let held = -1;
  let lastInteract = 0;

  const press = (i, ms = 140) => {
    const k = keys[i];
    if (!k) return;
    k.pressedUntil = performance.now() + ms;
    k.vel -= 2.5;
    onPress && onPress(k);
  };

  const pick = () => {
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(keys.map((k) => k.cap), false)[0];
    return hit ? hit.object.userData.key : -1;
  };

  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    mouse.x = ndc.x;
    mouse.y = ndc.y;
    mouse.inside = true;
    lastInteract = performance.now();
  };
  const onLeave = () => {
    mouse.inside = false;
    ndc.set(-9, -9);
    if (hovered !== -1) onHover && onHover(null);
    hovered = -1;
  };
  const onDown = (e) => {
    onMove(e);
    const i = pick();
    if (i >= 0) {
      held = i;
      press(i, 100000);
    }
  };
  const onUp = () => {
    if (held >= 0) keys[held].pressedUntil = 0;
    held = -1;
  };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);

  let rippled = false;
  let nextIdle = performance.now() + 3000;

  let visible = false;
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
  io.observe(canvas);

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

    if (!rippled && p > 0.32) {
      rippled = true;
      [...keys.keys()]
        .sort((a, b) => keys[a].group.position.x + keys[a].group.position.z * 0.6 - (keys[b].group.position.x + keys[b].group.position.z * 0.6))
        .forEach((i, n) => setTimeout(() => press(i, 90), 300 + n * 45));
    }
    if (now > nextIdle && now - lastInteract > 2500 && p > 0.3 && p < 0.8) {
      press((Math.random() * keys.length) | 0, 120);
      nextIdle = now + 900 + Math.random() * 2200;
    }

    const h = mouse.inside ? pick() : -1;
    if (h !== hovered) {
      hovered = h;
      onHover && onHover(h >= 0 ? keys[h] : null);
    }

    keys.forEach((k, i) => {
      const down = now < k.pressedUntil;
      k.target = down ? -0.2 : i === hovered ? 0.1 : 0;
      k.vel += ((k.target - k.off) * 420 - k.vel * 22) * dt;
      k.off += k.vel * dt;
      k.group.position.y = k.baseY + k.off;
    });

    mouse.sx += (mouse.x - mouse.sx) * 0.06;
    mouse.sy += (mouse.y - mouse.sy) * 0.06;
    const enter = Math.min(1, Math.max(0, (p - 0.08) / 0.38));
    const e = 1 - Math.pow(1 - enter, 3);
    board.rotation.x = -0.75 * (1 - e) + mouse.sy * -0.06;
    board.rotation.y = mouse.sx * 0.16 + (1 - e) * 0.4;
    board.rotation.z = (1 - e) * -0.08;
    board.position.y = -2.5 * (1 - e);
    board.position.z = -1 * (1 - e) + (p - 0.5) * -1.2;

    ray.setFromCamera(new THREE.Vector2(mouse.sx, mouse.sy), camera);
    const t = (2.2 - ray.ray.origin.y) / ray.ray.direction.y;
    torch.position.copy(ray.ray.origin).addScaledVector(ray.ray.direction, t);
    torch.intensity += ((mouse.inside ? 9 : 0) - torch.intensity) * 0.1;

    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCam);
  };
  raf = requestAnimationFrame(frame);

  return {
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (o.material.alphaMap) o.material.alphaMap.dispose();
          o.material.dispose();
        }
      });
      rt.dispose();
      post.dispose();
      renderer.dispose();
    },
  };
}
