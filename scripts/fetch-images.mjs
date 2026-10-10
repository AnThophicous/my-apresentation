import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'img');
const UA = 'brenno-experience/1.0 (portfolio build script; contato.brennoleon@gmail.com)';

const BOOKS = [
  ['pai-rico', 'Pai rico, pai pobre', 'Kiyosaki'],
  ['dont-make-me-think', "Don't make me think", 'Krug'],
  ['design-everyday-things', 'The design of everyday things', 'Norman'],
  ['laws-of-simplicity', 'The laws of simplicity', 'Maeda'],
  ['less-and-more', 'Less and more', 'Rams'],
  ['minimum', 'Minimum', 'Pawson'],
  ['clean-code', 'Clean code', 'Martin'],
  ['clean-architecture', 'Clean architecture', 'Martin'],
  ['pragmatic-programmer', 'The pragmatic programmer', 'Hunt'],
];

const HISTORY = [
  ['hamilton', 'File:Margaret Hamilton - restoration.jpg'],
  ['eniac', 'File:Eniac.jpg'],
  ['first-bug', 'File:First Computer Bug, 1945.jpg'],
  ['earthrise', 'File:NASA-Apollo8-Dec24-Earthrise.jpg'],
];

async function get(url, json = true) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return json ? res.json() : Buffer.from(await res.arrayBuffer());
}

async function save(path, buf) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, buf);
}

const credits = { books: {}, history: {} };

for (const [slug, title, author] of BOOKS) {
  try {
    const q = new URLSearchParams({ title, author, limit: '5', fields: 'title,author_name,cover_i,key' });
    const data = await get(`https://openlibrary.org/search.json?${q}`);
    const doc = data.docs.find((d) => d.cover_i);
    if (!doc) throw new Error('no cover');
    const img = await get(`https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`, false);
    await save(join(root, 'books', `${slug}.jpg`), img);
    credits.books[slug] = { source: `https://openlibrary.org${doc.key}`, cover: doc.cover_i, bytes: img.length };
    console.log('book   ', slug, img.length, 'bytes');
  } catch (e) {
    console.warn('book   ', slug, 'FAILED', e.message);
  }
}

for (const [slug, file] of HISTORY) {
  try {
    const q = new URLSearchParams({
      action: 'query',
      titles: file,
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiurlwidth: '1400',
      format: 'json',
      origin: '*',
    });
    const data = await get(`https://commons.wikimedia.org/w/api.php?${q}`);
    const page = Object.values(data.query.pages)[0];
    const info = page.imageinfo && page.imageinfo[0];
    if (!info) throw new Error('not found');
    const img = await get(info.thumburl || info.url, false);
    await save(join(root, 'history', `${slug}.jpg`), img);
    const meta = info.extmetadata || {};
    credits.history[slug] = {
      source: info.descriptionurl,
      license: meta.LicenseShortName && meta.LicenseShortName.value,
      artist: meta.Artist && meta.Artist.value.replace(/<[^>]+>/g, '').trim(),
      bytes: img.length,
    };
    console.log('history', slug, img.length, 'bytes', credits.history[slug].license);
  } catch (e) {
    console.warn('history', slug, 'FAILED', e.message);
  }
}

await save(join(root, 'CREDITS.json'), Buffer.from(JSON.stringify(credits, null, 2)));
console.log('done');
