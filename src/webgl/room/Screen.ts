import * as THREE from 'three';
import { clamp, progressBetween } from '@/core/math';

const WIDTH = 1024;
const HEIGHT = 640;
const FONT = '"Impostor Pro", sans-serif';
const BOOT_LINES = ['deep os 1.0', 'mounting /memories', 'loading 9 books', 'waking up the music', 'ready'];
const MESSAGE = 'Hi.';

export class Screen {
  readonly mesh: THREE.Mesh;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly texture: THREE.CanvasTexture;
  private readonly material: THREE.MeshBasicMaterial;
  private lastFrame = -1;

  constructor(width: number, height: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;
    this.material = new THREE.MeshBasicMaterial({ map: this.texture });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), this.material);
    this.render(-1);
  }

  get brightness(): number {
    return this.material.color.r;
  }

  render(time: number): void {
    const frame = time < 0 ? -1 : Math.floor(time * 30);
    if (frame === this.lastFrame) return;
    this.lastFrame = frame;
    const { ctx } = this;
    if (time < 0) this.paintOff();
    else if (time < 0.35) this.paintFlash(time / 0.35);
    else if (time < 1.6) this.paintBoot(time - 0.35);
    else this.paintMessage(time - 1.6);
    this.material.color.setScalar(time < 0 ? 1 : 1.45);
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    for (let y = 0; y < HEIGHT; y += 4) ctx.fillRect(0, y, WIDTH, 1);
    this.texture.needsUpdate = true;
  }

  private paintOff(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    gradient.addColorStop(0, '#181818');
    gradient.addColorStop(0.55, '#0b0b0b');
    gradient.addColorStop(1, '#050505');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  private paintFlash(t: number): void {
    const { ctx } = this;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    const height = Math.max(2, HEIGHT * Math.pow(t, 3));
    ctx.fillStyle = '#fff';
    ctx.fillRect(WIDTH * (0.5 - t * 0.5), HEIGHT / 2 - height / 2, WIDTH * t, height);
  }

  private paintBoot(t: number): void {
    const { ctx } = this;
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.font = `500 26px ${FONT}`;
    ctx.fillStyle = '#e8e8e8';
    const visible = Math.floor(t / 0.2);
    BOOT_LINES.slice(0, visible + 1).forEach((line, index) => {
      const characters = index < visible ? line.length : Math.floor(((t % 0.2) / 0.2) * line.length);
      ctx.fillText(`> ${line.slice(0, characters)}`, 64, 96 + index * 44);
    });
  }

  private paintMessage(t: number): void {
    const { ctx } = this;
    const fade = clamp(t / 0.35);
    const shade = Math.round(5 + fade * 245);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    const typed = Math.floor(progressBetween(0.45, 1.1, t) * MESSAGE.length);
    const text = MESSAGE.slice(0, typed);
    ctx.font = `600 250px ${FONT}`;
    ctx.fillStyle = '#0a0a0a';
    ctx.textBaseline = 'middle';
    const width = ctx.measureText(MESSAGE).width;
    const x = WIDTH / 2 - width / 2;
    ctx.fillText(text, x, HEIGHT / 2 + 8);
    if (Math.floor(t * 2.2) % 2 === 0) {
      const cursorX = x + ctx.measureText(text).width + 10;
      ctx.fillRect(cursorX, HEIGHT / 2 - 90, 10, 180);
    }
  }
}
