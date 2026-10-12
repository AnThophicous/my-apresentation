import { easeOutCubic, seededRandom } from '@/core/math';
import { ink, type SpecimenPainter, type SpecimenPointer } from './Specimen';

const IDLE_BREAK = 3.4;
const RAYS = 15;
const RINGS = 7;

interface Break {
  x: number;
  y: number;
  start: number;
  rays: { angle: number; bends: number[] }[];
  rings: number[];
}

export class FracturePainter implements SpecimenPainter {
  private width = 1;
  private height = 1;
  private current: Break | null = null;
  private seed = 1;

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  press(x: number, y: number, time: number): void {
    this.current = this.create(x, y, time);
  }

  draw(ctx: CanvasRenderingContext2D, time: number, _pointer: SpecimenPointer): void {
    if (!this.current || time - this.current.start > IDLE_BREAK) {
      const random = seededRandom(this.seed);
      this.current = this.create(
        this.width * (0.3 + random() * 0.4),
        this.height * (0.3 + random() * 0.4),
        time,
      );
    }
    const crack = this.current;
    const age = time - crack.start;
    const grow = easeOutCubic(Math.min(1, age / 0.7));
    const fade = 1 - Math.max(0, (age - IDLE_BREAK + 0.8) / 0.8);
    const reach = Math.hypot(this.width, this.height) * 0.75 * grow;
    ctx.lineWidth = 1;
    ctx.strokeStyle = ink(0.85 * fade);
    for (const ray of crack.rays) {
      ctx.beginPath();
      ctx.moveTo(crack.x, crack.y);
      ray.bends.forEach((bend, index) => {
        const radius = ((index + 1) / ray.bends.length) * reach;
        ctx.lineTo(
          crack.x + Math.cos(ray.angle + bend) * radius,
          crack.y + Math.sin(ray.angle + bend) * radius,
        );
      });
      ctx.stroke();
    }
    ctx.strokeStyle = ink(0.5 * fade);
    crack.rings.forEach((ring) => {
      const radius = ring * reach * 0.7;
      ctx.beginPath();
      crack.rays.forEach((ray, index) => {
        const px = crack.x + Math.cos(ray.angle) * radius;
        const py = crack.y + Math.sin(ray.angle) * radius;
        if (index === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.stroke();
    });
    ctx.fillStyle = ink(fade * (1 - grow) * 0.9);
    ctx.beginPath();
    ctx.arc(crack.x, crack.y, 3 + grow * 6, 0, Math.PI * 2);
    ctx.fill();
  }

  private create(x: number, y: number, time: number): Break {
    this.seed += 1;
    const random = seededRandom(this.seed * 31);
    const rays = Array.from({ length: RAYS }, (_, index) => ({
      angle: ((index + (random() - 0.5) * 0.7) / RAYS) * Math.PI * 2,
      bends: Array.from({ length: 6 }, () => (random() - 0.5) * 0.12),
    }));
    const rings = Array.from(
      { length: RINGS },
      (_, index) => Math.pow((index + 1) / RINGS, 1.8) * (0.9 + random() * 0.2),
    );
    return { x, y, start: time, rays, rings };
  }
}
