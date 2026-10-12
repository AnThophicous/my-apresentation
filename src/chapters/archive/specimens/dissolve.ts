import { seededRandom } from '@/core/math';
import { ink, type SpecimenPainter, type SpecimenPointer } from './Specimen';

const CELL = 7;
const SPREAD = 0.22;

interface Cell {
  x: number;
  y: number;
  order: number;
  noise: number;
  tone: number;
}

export class DissolvePainter implements SpecimenPainter {
  private cells: Cell[] = [];
  private width = 1;
  private height = 1;

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.cells = this.sample();
  }

  draw(ctx: CanvasRenderingContext2D, time: number, pointer: SpecimenPointer): void {
    const cycle = Math.pow(Math.sin(time * 0.6) * 0.5 + 0.5, 1.6) * 1.05 - 0.1;
    const sweep = pointer.active ? pointer.x / this.width : cycle;
    const threshold = sweep * (1 + SPREAD * 2) - SPREAD;
    const flicker = Math.floor(time * 24);
    for (const cell of this.cells) {
      const distance = cell.order + (cell.noise - 0.5) * 2 * SPREAD - threshold;
      if (distance < 0) continue;
      const edge = distance < 0.035;
      const spark = edge && (cell.x * 7 + cell.y * 13 + flicker) % 3 === 0;
      ctx.fillStyle = edge ? ink(spark ? 1 : 0.15) : ink(cell.tone);
      ctx.fillRect(cell.x, cell.y, CELL - 1, CELL - 1);
    }
  }

  private sample(): Cell[] {
    const mask = document.createElement('canvas');
    mask.width = Math.ceil(this.width);
    mask.height = Math.ceil(this.height);
    const ctx = mask.getContext('2d', { willReadFrequently: true })!;
    const size = Math.min(this.width * 0.42, this.height * 0.7);
    ctx.font = `600 ${size}px "Impostor Pro", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('Hi.', this.width / 2, this.height * 0.52);
    const pixels = ctx.getImageData(0, 0, mask.width, mask.height).data;
    const random = seededRandom(3);
    const originX = this.width * 0.12;
    const originY = this.height * 0.5;
    const reach = Math.hypot(this.width, this.height) * 0.8;
    const cells: Cell[] = [];
    for (let y = 0; y < this.height; y += CELL) {
      for (let x = 0; x < this.width; x += CELL) {
        const index = (Math.floor(y + CELL / 2) * mask.width + Math.floor(x + CELL / 2)) * 4 + 3;
        if ((pixels[index] ?? 0) < 128) continue;
        const order = 1 - Math.hypot(x - originX, y - originY) / reach;
        cells.push({
          x,
          y,
          order,
          noise: blobNoise(x, y) * 0.8 + random() * 0.2,
          tone: 0.55 + random() * 0.35,
        });
      }
    }
    return cells;
  }
}

function blobNoise(x: number, y: number): number {
  return (Math.sin(x * 0.045 + Math.sin(y * 0.031) * 2) * Math.cos(y * 0.052 - x * 0.013) + 1) / 2;
}
