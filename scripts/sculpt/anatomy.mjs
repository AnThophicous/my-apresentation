import {
  blended,
  capsule,
  clipped,
  ellipsoid,
  roundBox,
  roundCone,
  sphere,
  subtracted,
  torusY,
} from './sdf.mjs';

export const LAYERS = ['skin', 'hair', 'shirt', 'pants', 'sock', 'shoe', 'sole'];

const FINGERS = [
  { name: 'Thumb', radii: [0.0112, 0.0102, 0.0094] },
  { name: 'Index', radii: [0.0088, 0.0079, 0.0071] },
  { name: 'Middle', radii: [0.009, 0.0081, 0.0073] },
  { name: 'Ring', radii: [0.0085, 0.0077, 0.007] },
  { name: 'Pinky', radii: [0.0075, 0.0068, 0.0062] },
];

const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export function buildAnatomy(joints) {
  const parts = [];
  const joint = (name) => {
    const position = joints[`mixamorig:${name}`];
    if (!position) throw new Error(`Missing joint ${name}`);
    return position;
  };
  const add = (shape, bone, material, blend) =>
    parts.push({ shape, bone: `mixamorig:${bone}`, material, blend });
  const carve = (shape, blend) => parts.push({ shape, bone: null, material: 'skin', blend, carve: true });

  sculptHead(add, carve);
  sculptTorso(add, joint);
  for (const side of ['Left', 'Right']) {
    const sign = side === 'Left' ? 1 : -1;
    sculptArm(add, joint, side, sign);
    sculptHand(add, joint, side, sign);
    sculptLeg(add, joint, side, sign);
    sculptFoot(add, joint, side);
  }
  return parts;
}

function sculptHead(add, carve) {
  add(ellipsoid([0, 1.704, -0.006], [0.079, 0.092, 0.097]), 'Head', 'skin', 0.03);
  add(ellipsoid([0, 1.632, 0.034], [0.064, 0.07, 0.074]), 'Head', 'skin', 0.035);
  add(sphere([0, 1.586, 0.078], 0.022), 'Head', 'skin', 0.024);
  add(ellipsoid([0, 1.6, 0.05], [0.05, 0.03, 0.05]), 'Head', 'skin', 0.03);
  add(capsule([-0.033, 1.684, 0.089], [0.033, 1.684, 0.089], 0.0108), 'Head', 'skin', 0.018);
  add(capsule([0, 1.672, 0.099], [0, 1.636, 0.111], 0.0095), 'Head', 'skin', 0.012);
  add(sphere([0, 1.632, 0.109], 0.0122), 'Head', 'skin', 0.012);
  add(capsule([-0.012, 1.604, 0.099], [0.012, 1.604, 0.099], 0.0066), 'Head', 'skin', 0.008);
  for (const sign of [1, -1]) {
    add(sphere([0.043 * sign, 1.644, 0.064], 0.027), 'Head', 'skin', 0.026);
    add(ellipsoid([0.08 * sign, 1.655, -0.006], [0.011, 0.029, 0.019]), 'Head', 'skin', 0.01);
    carve(ellipsoid([0.0307 * sign, 1.6606, 0.0905], [0.0158, 0.0079, 0.0135]), 0.006);
  }
  add(sculptHair(), 'Head', 'hair', 0);
  add(roundCone([0, 1.43, -0.03], [0, 1.606, -0.012], 0.056, 0.049), 'Neck', 'skin', 0.034);
}

function sculptHair() {
  const tufts = [
    [0.028, 1.776, 0.04, 0.026],
    [-0.03, 1.778, 0.022, 0.027],
    [0.004, 1.783, -0.022, 0.028],
    [0.042, 1.765, -0.045, 0.024],
    [-0.046, 1.762, -0.05, 0.024],
    [0.018, 1.76, 0.074, 0.024],
    [-0.03, 1.755, 0.072, 0.022],
  ].map(([x, y, z, radius]) => sphere([x, y, z], radius));
  const cap = blended(
    [
      ellipsoid([0, 1.716, -0.012], [0.086, 0.082, 0.102]),
      ellipsoid([0, 1.672, -0.064], [0.076, 0.06, 0.05]),
      ellipsoid([0.01, 1.738, 0.06], [0.07, 0.022, 0.042]),
      ...tufts,
    ],
    0.022,
  );
  const face = ellipsoid([0, 1.612, 0.1], [0.072, 0.098, 0.072]);
  const leftEar = ellipsoid([0.086, 1.648, -0.004], [0.032, 0.052, 0.046]);
  const rightEar = ellipsoid([-0.086, 1.648, -0.004], [0.032, 0.052, 0.046]);
  const neckline = ellipsoid([0, 1.57, -0.02], [0.12, 0.062, 0.14]);
  return subtracted(
    subtracted(subtracted(subtracted(cap, face, 0.022), leftEar, 0.016), rightEar, 0.016),
    neckline,
    0.018,
  );
}

function sculptTorso(add, joint) {
  add(ellipsoid([0, 1.356, 0.016], [0.158, 0.126, 0.104]), 'Spine2', 'shirt', 0.045);
  add(capsule([-0.128, 1.414, -0.026], [0.128, 1.414, -0.026], 0.068), 'Spine2', 'shirt', 0.05);
  for (const sign of [1, -1]) {
    add(ellipsoid([0.062 * sign, 1.37, 0.068], [0.068, 0.054, 0.04]), 'Spine2', 'shirt', 0.03);
  }
  add(ellipsoid([0, 1.218, 0.02], [0.142, 0.122, 0.097]), 'Spine1', 'shirt', 0.05);
  add(
    clipped(ellipsoid([0, 1.102, 0.012], [0.151, 0.104, 0.1]), [0, -1, 0], -1.038, 0.006),
    'Spine',
    'shirt',
    0.05,
  );
  add(torusY([0, 1.474, -0.016], 0.06, 0.0105), 'Spine2', 'shirt', 0.012);
  add(ellipsoid([0, 0.996, 0.004], [0.146, 0.104, 0.096]), 'Hips', 'pants', 0.035);
}

function sculptArm(add, joint, side, sign) {
  const shoulder = joint(`${side}Arm`);
  const elbow = joint(`${side}ForeArm`);
  const wrist = joint(`${side}Hand`);
  add(sphere([0.152 * sign, 1.412, -0.034], 0.054), `${side}Shoulder`, 'shirt', 0.045);
  const sleeveEnd = lerp3(shoulder, elbow, 0.62);
  const sleeve = roundCone(
    add3(shoulder, [-0.012 * sign, 0, 0]),
    add3(sleeveEnd, [0.02 * sign, 0, 0]),
    0.06,
    0.053,
  );
  add(clipped(sleeve, [sign, 0, 0], sign * sleeveEnd[0], 0.004), `${side}Arm`, 'shirt', 0.03);
  add(roundCone(shoulder, elbow, 0.045, 0.038), `${side}Arm`, 'skin', 0.02);
  add(sphere(elbow, 0.0385), `${side}ForeArm`, 'skin', 0.02);
  add(roundCone(elbow, add3(wrist, [-0.006 * sign, 0, 0]), 0.038, 0.027), `${side}ForeArm`, 'skin', 0.02);
}

function sculptHand(add, joint, side, sign) {
  const wrist = joint(`${side}Hand`);
  const knuckles = joint(`${side}HandMiddle1`);
  const center = lerp3(wrist, knuckles, 0.55);
  add(
    roundBox([center[0], center[1] - 0.001, -0.057], [0.05, 0.0135, 0.039], 0.012),
    `${side}Hand`,
    'skin',
    0.016,
  );
  add(ellipsoid([0.733 * sign, 1.428, -0.031], [0.026, 0.0145, 0.021]), `${side}HandThumb1`, 'skin', 0.016);
  for (const finger of FINGERS) {
    const points = [1, 2, 3, 4].map((segment) => joint(`${side}Hand${finger.name}${segment}`));
    for (let segment = 0; segment < 3; segment += 1) {
      add(
        roundCone(
          points[segment],
          points[segment + 1],
          finger.radii[segment],
          finger.radii[Math.min(segment + 1, 2)],
        ),
        `${side}Hand${finger.name}${segment + 1}`,
        'skin',
        0.0055,
      );
    }
  }
}

function sculptLeg(add, joint, side, sign) {
  const hip = joint(`${side}UpLeg`);
  const knee = joint(`${side}Leg`);
  const ankle = joint(`${side}Foot`);
  add(ellipsoid([0.068 * sign, 0.93, -0.038], [0.074, 0.08, 0.07]), `${side}UpLeg`, 'pants', 0.04);
  add(roundCone(add3(hip, [0, 0.02, 0]), knee, 0.087, 0.058), `${side}UpLeg`, 'pants', 0.05);
  add(sphere(knee, 0.051), `${side}Leg`, 'pants', 0.04);
  const hem = add3(ankle, [0, 0.042, 0]);
  add(
    clipped(roundCone(knee, add3(hem, [0, -0.02, 0]), 0.056, 0.05), [0, -1, 0], -hem[1], 0.004),
    `${side}Leg`,
    'pants',
    0.03,
  );
  add(
    capsule(add3(ankle, [0, 0.07, -0.004]), add3(ankle, [0, -0.012, -0.004]), 0.033),
    `${side}Foot`,
    'sock',
    0.012,
  );
}

function sculptFoot(add, joint, side) {
  const ankle = joint(`${side}Foot`);
  const toe = joint(`${side}ToeBase`);
  const tip = joint(`${side}Toe_End`);
  const x = ankle[0];
  const floor = 0.0;
  const heel = ellipsoid([x, 0.052, -0.04], [0.046, 0.052, 0.062]);
  add(clipped(heel, [0, -1, 0], -(floor + 0.012), 0.004), `${side}Foot`, 'shoe', 0.035);
  const forefoot = ellipsoid([x, 0.038, (toe[2] + tip[2]) / 2 - 0.01], [0.049, 0.037, 0.088]);
  add(clipped(forefoot, [0, -1, 0], -(floor + 0.012), 0.004), `${side}ToeBase`, 'shoe', 0.035);
  add(roundBox([x, floor + 0.011, -0.045], [0.05, 0.011, 0.07], 0.008), `${side}Foot`, 'sole', 0.006);
  add(roundBox([x, floor + 0.011, 0.105], [0.052, 0.011, 0.1], 0.009), `${side}ToeBase`, 'sole', 0.006);
}
