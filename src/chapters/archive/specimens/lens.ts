import { ink, type SpecimenPainter, type SpecimenPointer } from './Specimen';

const SPACING = 13;

export class LensPainter implements SpecimenPainter {
  private width = 1;
  private height = 1;

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  draw(ctx: CanvasRenderingContext2D, time: number, pointer: SpecimenPointer): void {
    const centerX = pointer.active ? pointer.x : this.width * (0.5 + Math.cos(time * 0.4) * 0.22);
    const centerY = pointer.active ? pointer.y : this.height * (0.5 + Math.sin(time * 0.55) * 0.18);
    const horizon = Math.min(this.width, this.height) * 0.11;
    const twist = 1.3 + Math.sin(time * 0.6) * 0.2;
    ctx.fillStyle = ink(0.62);
    for (let y = -SPACING; y < this.height + SPACING; y += SPACING) {
      for (let x = -SPACING; x < this.width + SPACING; x += SPACING) {
        const dx = x - centerX;
        const dy = y - centerY;
        const radius = Math.hypot(dx, dy);
        if (radius < 1) continue;
        const closeness = horizon / Math.max(radius, horizon);
        const stretch = 1 + ((horizon * horizon) / (radius * radius)) * 2.2;
        const angle = closeness * closeness * twist;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const px = centerX + (dx * cos - dy * sin) * stretch;
        const py = centerY + (dx * sin + dy * cos) * stretch;
        const size = 1.2 / Math.sqrt(stretch);
        ctx.fillRect(px - size / 2, py - size / 2, size, size);
      }
    }
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(centerX, centerY, horizon * 1.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ink(0.85);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, horizon * 1.32, 0, Math.PI * 2);
    ctx.stroke();
  }
}
