import sharp from 'sharp';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'og.png');

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#fff"/>
  <line x1="600" y1="-10" x2="600" y2="228" stroke="#000" stroke-width="8" stroke-linecap="round"/>
  <circle cx="600" cy="228" r="14" fill="#000"/>
  <text x="600" y="390" text-anchor="middle" font-family="Montserrat, Arial, sans-serif" font-size="86" font-weight="800" letter-spacing="-4" fill="#000">Brenno Leon</text>
  <text x="600" y="452" text-anchor="middle" font-family="Montserrat, Arial, sans-serif" font-size="22" font-weight="600" letter-spacing="7" fill="#000" opacity=".55">FULL STACK · FRONT-END · WEBGL</text>
  <text x="600" y="580" text-anchor="middle" font-family="Montserrat, Arial, sans-serif" font-size="18" font-weight="500" letter-spacing="5" fill="#000" opacity=".4">PUXE A LINHA</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(out);
console.log('og image', out);
