import { ink, type SpecimenPainter, type SpecimenPointer } from './Specimen';

const WAVES = [
  { length: 220, amplitude: 9, speed: 1.1, steepness: 0.7 },
  { length: 130, amplitude: 5, speed: 1.6, steepness: 0.6 },
  { length: 70, amplitude: 2.4, speed: 2.3, steepness: 0.5 },
];
const ROWS = 15;
const SAMPLES = 72;

export class SwellPainter implements SpecimenPainter {
  private width = 1;
  private height = 1;

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  draw(ctx: CanvasRenderingContext2D, time: number, pointer: SpecimenPointer): void {
    ctx.lineWidth = 1;
    for (let row = 0; row < ROWS; row += 1) {
      const depth = row / (ROWS - 1);
      const baseY = this.height * (0.22 + depth * 0.66);
      const perspective = 0.35 + depth * 0.65;
      ctx.beginPath();
      for (let sample = 0; sample <= SAMPLES; sample += 1) {
        const x = (sample / SAMPLES) * this.width;
        let shiftX = 0;
        let shiftY = 0;
        for (const wave of WAVES) {
          const phase = (x / wave.length) * Math.PI * 2 - time * wave.speed + row * 0.45;
          shiftX += Math.cos(phase) * wave.amplitude * wave.steepness;
          shiftY += Math.sin(phase) * wave.amplitude;
        }
        if (pointer.active) {
          const distance = Math.hypot(x - pointer.x, baseY - pointer.y);
          shiftY -= Math.exp(-(distance * distance) / 2600) * Math.sin(distance * 0.09 - time * 7) * 12;
        }
        const px = x + shiftX * perspective;
        const py = baseY + shiftY * perspective;
        if (sample === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = ink(0.18 + depth * 0.62);
      ctx.stroke();
    }
  }
}
