import * as THREE from 'three';
import { seededRandom } from '@/core/math';
import { mesh, type ClayPalette } from './clay';
import { CHAIR, DESK, INNER, KEYBOARD, MONITOR } from './layout';
import { Screen } from './Screen';
import { roundedBox } from './shapes';

export interface Workspace {
  group: THREE.Group;
  screen: Screen;
  hitbox: THREE.Mesh;
  chair: THREE.Group;
}

export function buildWorkspace(palette: ClayPalette): Workspace {
  const group = new THREE.Group();
  group.add(buildDesk(palette));
  const screen = new Screen(MONITOR.width, MONITOR.height);
  group.add(buildMonitor(palette, screen));
  group.add(buildKeyboard(palette));
  group.add(buildDeskItems(palette));
  group.add(buildShelf(palette));
  const chair = buildChair(palette);
  group.add(chair);
  const hitbox = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.62, 1.0),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitbox.position.set(MONITOR.x + 0.15, 1.0, MONITOR.z);
  group.add(hitbox);
  return { group, screen, hitbox, chair };
}

function buildDesk(palette: ClayPalette): THREE.Group {
  const group = new THREE.Group();
  const top = mesh(roundedBox(DESK.depth, 0.04, DESK.width, 0.012), palette.get(0.8, { roughness: 0.55 }));
  top.position.set(DESK.x, DESK.height - 0.02, DESK.z);
  group.add(top);
  const legMaterial = palette.get(0.14, { roughness: 0.5 });
  for (const dx of [-1, 1]) {
    for (const dz of [-1, 1]) {
      const leg = mesh(new THREE.CylinderGeometry(0.018, 0.018, DESK.height - 0.04, 12), legMaterial);
      leg.position.set(
        DESK.x + dx * (DESK.depth / 2 - 0.05),
        (DESK.height - 0.04) / 2,
        DESK.z + dz * (DESK.width / 2 - 0.05),
      );
      group.add(leg);
    }
  }
  const drawers = mesh(roundedBox(0.5, 0.56, 0.42, 0.02), palette.get(0.2, { roughness: 0.75 }));
  drawers.position.set(DESK.x - 0.06, 0.3, DESK.z + DESK.width / 2 - 0.3);
  group.add(drawers);
  return group;
}

function buildMonitor(palette: ClayPalette, screen: Screen): THREE.Group {
  const group = new THREE.Group();
  const dark = palette.get(0.07, { roughness: 0.4 });
  const base = mesh(roundedBox(0.2, 0.014, 0.26, 0.006), dark);
  base.position.set(MONITOR.x - 0.02, DESK.height + 0.007, MONITOR.z);
  const neck = mesh(roundedBox(0.03, 0.3, 0.05, 0.01), dark);
  neck.position.set(MONITOR.x - 0.045, DESK.height + 0.15, MONITOR.z);
  const panel = mesh(roundedBox(0.035, MONITOR.height + 0.045, MONITOR.width + 0.045, 0.012), dark);
  panel.position.set(MONITOR.x, MONITOR.y, MONITOR.z);
  screen.mesh.rotation.y = Math.PI / 2;
  screen.mesh.position.set(MONITOR.x + 0.0185, MONITOR.y, MONITOR.z);
  group.add(base, neck, panel, screen.mesh);
  return group;
}

function buildKeyboard(palette: ClayPalette): THREE.Group {
  const group = new THREE.Group();
  const body = mesh(roundedBox(0.15, 0.018, 0.42, 0.006), palette.get(0.86, { roughness: 0.5 }));
  body.position.copy(KEYBOARD).setY(DESK.height + 0.009);
  group.add(body);
  const keys = new THREE.InstancedMesh(
    roundedBox(0.022, 0.01, 0.022, 0.003, 2),
    palette.get(0.93, { roughness: 0.45 }),
    4 * 15,
  );
  keys.castShadow = true;
  keys.receiveShadow = true;
  const matrix = new THREE.Matrix4();
  let index = 0;
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 15; column += 1) {
      matrix.makeTranslation(
        KEYBOARD.x - 0.05 + row * 0.03,
        DESK.height + 0.022,
        KEYBOARD.z - 0.19 + column * 0.027,
      );
      keys.setMatrixAt(index, matrix);
      index += 1;
    }
  }
  group.add(keys);
  const mouse = mesh(new THREE.SphereGeometry(0.03, 20, 14), palette.get(0.86, { roughness: 0.45 }));
  mouse.scale.set(1.5, 0.55, 1);
  mouse.position.set(KEYBOARD.x + 0.02, DESK.height + 0.012, KEYBOARD.z + 0.32);
  group.add(mouse);
  return group;
}

function buildDeskItems(palette: ClayPalette): THREE.Group {
  const group = new THREE.Group();
  const ceramic = palette.get(0.9, { roughness: 0.35 });
  const mug = mesh(new THREE.CylinderGeometry(0.04, 0.036, 0.095, 24), ceramic);
  mug.position.set(DESK.x - 0.1, DESK.height + 0.048, DESK.z - 0.55);
  const handle = mesh(new THREE.TorusGeometry(0.024, 0.007, 8, 20, Math.PI), ceramic);
  handle.position.set(DESK.x - 0.1, DESK.height + 0.05, DESK.z - 0.55 + 0.042);
  handle.rotation.set(0, Math.PI / 2, -Math.PI / 2);
  const band = mesh(
    new THREE.TorusGeometry(0.085, 0.012, 10, 30, Math.PI),
    palette.get(0.08, { roughness: 0.4 }),
  );
  band.position.set(DESK.x + 0.12, DESK.height + 0.015, DESK.z + 0.52);
  band.rotation.set(-Math.PI / 2, 0, 0.6);
  group.add(mug, handle, band);
  for (const side of [-1, 1]) {
    const cup = mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.035, 20),
      palette.get(0.08, { roughness: 0.4 }),
    );
    cup.position.set(
      DESK.x + 0.12 + Math.cos(0.6) * 0.085 * side,
      DESK.height + 0.018,
      DESK.z + 0.52 + Math.sin(0.6) * 0.085 * side,
    );
    group.add(cup);
  }
  return group;
}

function buildShelf(palette: ClayPalette): THREE.Group {
  const group = new THREE.Group();
  const random = seededRandom(64);
  const board = mesh(roundedBox(0.24, 0.03, 1.15, 0.008), palette.get(0.8, { roughness: 0.55 }));
  board.position.set(-INNER + 0.12, 1.62, DESK.z);
  group.add(board);
  let z = DESK.z - 0.5;
  while (z < DESK.z + 0.42) {
    const thickness = 0.026 + random() * 0.03;
    const height = 0.17 + random() * 0.09;
    const tone = [0.08, 0.14, 0.9, 0.82, 0.45][Math.floor(random() * 5)]!;
    const book = mesh(roundedBox(0.17, height, thickness, 0.004), palette.get(tone, { roughness: 0.7 }));
    book.position.set(-INNER + 0.1, 1.635 + height / 2, z + thickness / 2);
    group.add(book);
    z += thickness + 0.004;
  }
  const leaning = mesh(roundedBox(0.17, 0.22, 0.035, 0.004), palette.get(0.9));
  leaning.position.set(-INNER + 0.1, 1.635 + 0.105, z + 0.08);
  leaning.rotation.x = -0.35;
  group.add(leaning);
  return group;
}

function buildChair(palette: ClayPalette): THREE.Group {
  const group = new THREE.Group();
  const shell = palette.get(0.11, { roughness: 0.65 });
  const metal = palette.get(0.55, { roughness: 0.3 });
  const seat = mesh(roundedBox(0.48, 0.08, 0.48, 0.035, 4), shell);
  seat.position.set(0, CHAIR.seat - 0.04, 0);
  const back = mesh(roundedBox(0.07, 0.56, 0.46, 0.035, 4), shell);
  back.position.set(0.27, CHAIR.seat + 0.34, 0);
  back.rotation.z = -0.12;
  const spine = mesh(roundedBox(0.03, 0.26, 0.05, 0.01), metal);
  spine.position.set(0.24, CHAIR.seat + 0.08, 0);
  const piston = mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.32, 14), metal);
  piston.position.y = 0.26;
  group.add(seat, back, spine, piston);
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2;
    const spoke = mesh(roundedBox(0.3, 0.03, 0.045, 0.012), metal);
    spoke.position.set(Math.cos(angle) * 0.15, 0.07, Math.sin(angle) * 0.15);
    spoke.rotation.y = -angle;
    const wheel = mesh(new THREE.SphereGeometry(0.028, 14, 10), shell);
    wheel.position.set(Math.cos(angle) * 0.29, 0.028, Math.sin(angle) * 0.29);
    group.add(spoke, wheel);
  }
  group.position.set(CHAIR.x, 0, CHAIR.z);
  return group;
}
