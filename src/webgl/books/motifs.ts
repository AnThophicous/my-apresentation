import type { CoverMotif } from '@/content/books';

export interface MotifBox {
  x: number;
  y: number;
  size: number;
  ink: string;
  paper: string;
}

type MotifPainter = (ctx: CanvasRenderingContext2D, box: MotifBox) => void;

const stroke = (ctx: CanvasRenderingContext2D, box: MotifBox, ratio = 0.012): void => {
  ctx.strokeStyle = box.ink;
  ctx.lineWidth = box.size * ratio;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
};

const circle = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void => {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
};

const twoPaths: MotifPainter = (ctx, box) => {
  const { x, y, size } = box;
  const radius = size * 0.2;
  const centerY = y + size * 0.5;
  stroke(ctx, box);
  ctx.beginPath();
  ctx.moveTo(x + size * 0.04, centerY);
  ctx.lineTo(x + size * 0.96, centerY);
  ctx.stroke();
  circle(ctx, x + size * 0.3, centerY, radius);
  ctx.fillStyle = box.ink;
  ctx.fill();
  circle(ctx, x + size * 0.7, centerY, radius);
  ctx.fillStyle = box.paper;
  ctx.fill();
  ctx.stroke();
};

const target: MotifPainter = (ctx, box) => {
  const { x, y, size } = box;
  stroke(ctx, box, 0.01);
  circle(ctx, x + size * 0.5, y + size * 0.5, size * 0.36);
  ctx.stroke();
  circle(ctx, x + size * 0.5, y + size * 0.5, size * 0.06);
  ctx.fillStyle = box.ink;
  ctx.fill();
};

const teapot: MotifPainter = (ctx, box) => {
  const { x, y, size } = box;
  stroke(ctx, box, 0.013);
  const cx = x + size * 0.46;
  const cy = y + size * 0.58;
  ctx.beginPath();
  ctx.ellipse(cx, cy, size * 0.26, size * 0.2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy - size * 0.21, size * 0.11, size * 0.035, 0, 0, Math.PI * 2);
  ctx.stroke();
  circle(ctx, cx, cy - size * 0.27, size * 0.025);
  ctx.fillStyle = box.ink;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + size * 0.27, cy - size * 0.02, size * 0.1, -Math.PI * 0.55, Math.PI * 0.45);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + size * 0.2, cy + size * 0.12);
  ctx.quadraticCurveTo(cx + size * 0.36, cy + size * 0.12, cx + size * 0.44, cy + size * 0.24);
  ctx.stroke();
};

const tenLaws: MotifPainter = (ctx, box) => {
  const { x, y, size } = box;
  stroke(ctx, box, 0.01);
  for (let i = 0; i < 10; i += 1) {
    const lineY = y + size * (0.12 + i * 0.085);
    ctx.beginPath();
    ctx.moveTo(x + size * 0.08, lineY);
    ctx.lineTo(x + size * (0.92 - i * 0.082), lineY);
    ctx.stroke();
  }
};

const keypad: MotifPainter = (ctx, box) => {
  const { x, y, size } = box;
  const columns = 4;
  const rows = 5;
  const gap = size * 0.035;
  const key = (size * 0.8 - gap * (columns - 1)) / columns;
  const startX = x + (size - (key * columns + gap * (columns - 1))) / 2;
  const startY = y + (size - (key * rows + gap * (rows - 1))) / 2;
  stroke(ctx, box, 0.008);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const keyX = startX + column * (key + gap);
      const keyY = startY + row * (key + gap);
      ctx.beginPath();
      ctx.roundRect(keyX, keyY, key, key, key * 0.28);
      if (row === rows - 1 && column === columns - 1) {
        ctx.fillStyle = box.ink;
        ctx.fill();
      } else {
        ctx.stroke();
      }
    }
  }
};

const frame: MotifPainter = (ctx, box) => {
  const { x, y, size } = box;
  stroke(ctx, box, 0.006);
  ctx.strokeRect(x + size * 0.3, y + size * 0.1, size * 0.4, size * 0.8);
  ctx.fillStyle = box.ink;
  ctx.fillRect(x + size * 0.47, y + size * 0.66, size * 0.06, size * 0.06);
};

const codeLines: MotifPainter = (ctx, box) => {
  const { x, y, size } = box;
  const lines: readonly [number, number][] = [
    [0, 0.55],
    [1, 0.42],
    [2, 0.36],
    [2, 0.5],
    [1, 0.18],
    [1, 0.46],
    [0, 0.12],
  ];
  ctx.fillStyle = box.ink;
  lines.forEach(([indent, length], index) => {
    const lineX = x + size * (0.1 + indent * 0.09);
    const lineY = y + size * (0.16 + index * 0.1);
    ctx.beginPath();
    ctx.roundRect(lineX, lineY, size * length, size * 0.035, size * 0.0175);
    ctx.fill();
  });
};

const rings: MotifPainter = (ctx, box) => {
  const { x, y, size } = box;
  const centerX = x + size * 0.5;
  const centerY = y + size * 0.5;
  stroke(ctx, box, 0.008);
  [0.42, 0.31, 0.2, 0.09].forEach((radius) => {
    circle(ctx, centerX, centerY, size * radius);
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.moveTo(centerX + size * 0.46, centerY - size * 0.02);
  ctx.lineTo(centerX + size * 0.13, centerY - size * 0.02);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(centerX + size * 0.17, centerY - size * 0.06);
  ctx.lineTo(centerX + size * 0.12, centerY - size * 0.02);
  ctx.lineTo(centerX + size * 0.17, centerY + size * 0.02);
  ctx.stroke();
};

const brokenWindow: MotifPainter = (ctx, box) => {
  const { x, y, size } = box;
  const left = x + size * 0.2;
  const top = y + size * 0.1;
  const width = size * 0.6;
  const height = size * 0.8;
  stroke(ctx, box, 0.01);
  ctx.strokeRect(left, top, width, height);
  ctx.beginPath();
  ctx.moveTo(left + width / 2, top);
  ctx.lineTo(left + width / 2, top + height);
  for (let row = 1; row < 3; row += 1) {
    ctx.moveTo(left, top + (height / 3) * row);
    ctx.lineTo(left + width, top + (height / 3) * row);
  }
  ctx.stroke();
  const paneX = left + width / 2;
  const paneY = top + height / 3;
  const cracks: readonly [number, number][] = [
    [0.5, 0.45],
    [0.15, 0.1],
    [0.85, 0.2],
    [0.2, 0.9],
    [0.9, 0.8],
    [0.6, 0.02],
  ];
  ctx.lineWidth = size * 0.005;
  cracks.forEach(([dx, dy], index) => {
    if (index === 0) return;
    ctx.beginPath();
    ctx.moveTo(paneX + (width / 2) * cracks[0]![0], paneY + (height / 3) * cracks[0]![1]);
    ctx.lineTo(paneX + (width / 2) * dx, paneY + (height / 3) * dy);
    ctx.stroke();
  });
};

export const MOTIFS: Record<CoverMotif, MotifPainter> = {
  twoPaths,
  target,
  teapot,
  tenLaws,
  keypad,
  frame,
  codeLines,
  rings,
  brokenWindow,
};
