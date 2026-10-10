import sharp from 'sharp';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'img');
const out = join(root, 'out');
await mkdir(out, { recursive: true });

const CROPS = {
  'less-and-more': { left: 99, top: 44, width: 282, height: 428 },
  'clean-architecture': { left: 7, top: 5, width: 339, height: 488 },
  earthrise: { left: 260, top: 640, width: 1400, height: 1100 },
};

const manifest = {};

for (const dir of ['books', 'history']) {
  for (const file of await readdir(join(root, dir))) {
    const slug = parse(file).name;
    let img = sharp(join(root, dir, file));
    if (CROPS[slug]) img = img.extract(CROPS[slug]);
    else img = img.trim({ threshold: 18 });
    const width = dir === 'books' ? 440 : 1400;
    const buf = await img.resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    await writeFile(join(out, `${slug}.webp`), buf.data);
    manifest[slug] = { w: buf.info.width, h: buf.info.height };
    console.log(slug, buf.info.width, 'x', buf.info.height, buf.data.length, 'bytes');
  }
}

await writeFile(join(root, 'out', 'manifest.json'), JSON.stringify(manifest, null, 2));
