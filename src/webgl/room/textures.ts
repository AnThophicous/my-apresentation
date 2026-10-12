import * as THREE from 'three';
import { seededRandom } from '@/core/math';

function canvasTexture(
  width: number,
  height: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function floorPlanks(): THREE.CanvasTexture {
  const random = seededRandom(31);
  const texture = canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = '#d6d4cf';
    ctx.fillRect(0, 0, 1024, 1024);
    const plankWidth = 1024 / 8;
    for (let column = 0; column < 8; column += 1) {
      let y = -random() * 400;
      while (y < 1024) {
        const length = 380 + random() * 420;
        const shade = 200 + Math.round(random() * 28);
        ctx.fillStyle = `rgb(${shade},${shade - 1},${shade - 4})`;
        ctx.fillRect(column * plankWidth + 1.5, y + 1.5, plankWidth - 3, length - 3);
        for (let grain = 0; grain < 14; grain += 1) {
          ctx.strokeStyle = `rgba(0,0,0,${0.02 + random() * 0.035})`;
          ctx.lineWidth = 1 + random() * 1.5;
          ctx.beginPath();
          const gx = column * plankWidth + 6 + random() * (plankWidth - 12);
          ctx.moveTo(gx, y + 4);
          ctx.bezierCurveTo(
            gx + random() * 8 - 4,
            y + length * 0.3,
            gx + random() * 8 - 4,
            y + length * 0.7,
            gx + random() * 6 - 3,
            y + length - 4,
          );
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(column * plankWidth, y + length - 1.5, plankWidth, 1.5);
        y += length;
      }
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(column * plankWidth, 0, 1.5, 1024);
    }
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

export function woven(): THREE.CanvasTexture {
  const random = seededRandom(7);
  const texture = canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = '#9d9b96';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9000; i += 1) {
      const shade = 120 + Math.round(random() * 70);
      ctx.fillStyle = `rgba(${shade},${shade},${shade},0.35)`;
      ctx.fillRect(random() * 512, random() * 512, 3, 1.4);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 6;
    ctx.strokeRect(30, 30, 452, 452);
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function seascapePrint(): THREE.CanvasTexture {
  const random = seededRandom(3);
  return canvasTexture(512, 640, (ctx) => {
    ctx.fillStyle = '#f1f0ec';
    ctx.fillRect(0, 0, 512, 640);
    const sky = ctx.createLinearGradient(0, 60, 0, 320);
    sky.addColorStop(0, '#3a3a38');
    sky.addColorStop(1, '#a8a7a2');
    ctx.fillStyle = sky;
    ctx.fillRect(60, 60, 392, 260);
    const sea = ctx.createLinearGradient(0, 320, 0, 580);
    sea.addColorStop(0, '#5e5e5b');
    sea.addColorStop(1, '#151514');
    ctx.fillStyle = sea;
    ctx.fillRect(60, 320, 392, 260);
    for (let i = 0; i < 1600; i += 1) {
      const y = 322 + Math.pow(random(), 1.6) * 256;
      ctx.fillStyle = `rgba(255,255,255,${0.03 + random() * 0.05})`;
      ctx.fillRect(60 + random() * 392, y, 3 + random() * 9, 1);
    }
  });
}

export function horizonPrint(): THREE.CanvasTexture {
  return canvasTexture(512, 640, (ctx) => {
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, 512, 640);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 46; i += 1) {
      ctx.lineWidth = 0.7 + (i % 5) * 0.2;
      ctx.beginPath();
      ctx.ellipse(256, 330, 70 + i * 3.2, 14 + i * 0.85, -0.12, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#0d0d0d';
    ctx.beginPath();
    ctx.arc(256, 326, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(256, 326, 60, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = '500 18px "Impostor Pro", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('EVENT HORIZON', 40, 600);
  });
}
