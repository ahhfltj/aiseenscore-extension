// Generates public/icon/{16,32,48,128}.png from the SVG below. Run: node scripts/make-icons.mjs
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="28" fill="#2848c7"/>
  <path d="M14 64C30 38 48 28 64 28s34 10 50 36c-16 26-34 36-50 36S30 90 14 64Z" fill="none" stroke="#fff" stroke-width="8" stroke-linejoin="round"/>
  <circle cx="64" cy="64" r="16" fill="#f3d54a"/>
</svg>`;

await mkdir('public/icon', { recursive: true });
await writeFile('public/icon/icon.svg', svg);
for (const size of [16, 32, 48, 128]) {
  await sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png().toFile(`public/icon/${size}.png`);
}
