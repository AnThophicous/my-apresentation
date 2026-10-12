import { seededRandom } from '@/core/math';
import { ink, type SpecimenPainter, type SpecimenPointer } from './Specimen';

const REPEL_RADIUS = 56;

interface Particle {
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  velocityX: number;
  velocityY: number;
}

export class ParticlesPainter implements SpecimenPainter {
  private particles: Particle[] = [];
  private lastTime = 0;

  resize(width: number, height: number): void {
    this.particles = sample(width, height);
  }

  draw(ctx: CanvasRenderingContext2D, time: number, pointer: SpecimenPointer): void {
    const delta = Math.min(0.05, Math.max(0, time - this.lastTime));
    this.lastTime = time;
    ctx.fillStyle = ink(0.9);
    for (const particle of this.particles) {
      let forceX = (particle.homeX - particle.x) * 28;
      let forceY = (particle.homeY - particle.y) * 28;
      if (pointer.active) {
        const dx = particle.x - pointer.x;
        const dy = particle.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < REPEL_RADIUS && distance > 0.01) {
          const push = Math.pow(1 - distance / REPEL_RADIUS, 2) * 5200;
          forceX += (dx / distance) * push;
          forceY += (dy / distance) * push;
        }
      }
      particle.velocityX = (particle.velocityX + forceX * delta) * Math.pow(0.02, delta);
      particle.velocityY = (particle.velocityY + forceY * delta) * Math.pow(0.02, delta);
      particle.x += particle.velocityX * delta;
      particle.y += particle.velocityY * delta;
      ctx.fillRect(particle.x - 0.8, particle.y - 0.8, 1.6, 1.6);
    }
  }
}

function sample(width: number, height: number): Particle[] {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width);
  canvas.height = Math.ceil(height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const size = Math.min(width * 0.62, height * 0.86);
  ctx.font = `600 ${size}px "Impostor Pro", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText('B.', width / 2, height * 0.54);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const random = seededRandom(9);
  const particles: Particle[] = [];
  const step = 4;
  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      if ((pixels[(y * canvas.width + x) * 4 + 3] ?? 0) < 128) continue;
      const homeX = x + random() * 2;
      const homeY = y + random() * 2;
      particles.push({ x: homeX, y: homeY, homeX, homeY, velocityX: 0, velocityY: 0 });
    }
  }
  return particles;
}
