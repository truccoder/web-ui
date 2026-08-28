#!/usr/bin/env node
/**
 * Rasterises the Elite Nexus brand mark into every raster app icon:
 *
 *   node scripts/build-app-icons.mjs .
 *
 * WHY A SCRIPT AND NOT FIVE COMMITTED PNGs WITH NO SOURCE. The mark lives in exactly two places
 * that a person edits — `src/shared/components/brand-mark.tsx` for the app and `src/app/icon.svg`
 * for the browser tab — and both are the same 256-unit geometry copied from the DS. The PNGs and
 * the `.ico` are DERIVED from that geometry, and a derived binary with no generator is a file
 * nobody can correct: the next person to move a coordinate would have to redraw five images by
 * hand in a tool this repo does not have.
 *
 * NO IMAGE LIBRARY. `sharp` is not installed and nothing else here needs it, so adding a native
 * dependency to draw three rounded rectangles would be the expensive way round. The shapes are
 * signed distance fields sampled 4×4 per pixel; PNG is `zlib.deflateSync` over filter-0 scanlines
 * and the `.ico` is the Vista-era PNG-in-ICO container, which every browser in the support matrix
 * reads.
 *
 * WHAT IT WRITES — and what is deliberately different in each cut:
 *   public/icons/icon-{192x192,512x512}.png   the mark as the DS draws it, 8/256 inset.
 *   public/icons/icon-maskable-512x512.png   full-bleed ink, glyph enlarged into the 80% safe
 *                                       circle: a launcher mask crops the corners off a shape
 *                                       whose corners ARE the shape.
 *   src/app/apple-icon.png               full-bleed for the same reason — iOS applies its own
 *                                       mask and refuses transparency.
 *   src/app/favicon.ico                  16/32/48, square nearly flush and glyph at 1.18: at
 *                                       16px the mark's own margins leave no chevron to see.
 *
 * The chevron is DRAWN here rather than knocked out of the square (`brand-mark.tsx` cuts it, so
 * the page shows through). A knock-out needs a known background; none of these files has one.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';

const INK = [0x10, 0x18, 0x20];
const LIGHT = [0xec, 0xee, 0xec];
const AMBER = [0xd1, 0x8f, 0x2e];

function sdRoundRect(px, py, cx, cy, hx, hy, r) {
  const qx = Math.abs(px - cx) - (hx - r);
  const qy = Math.abs(py - cy) - (hy - r);
  const ax = Math.max(qx, 0),
    ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
}
function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax,
    pay = py - ay,
    bax = bx - ax,
    bay = by - ay;
  let h = (pax * bax + pay * bay) / (bax * bax + bay * bay);
  h = Math.max(0, Math.min(1, h));
  return Math.hypot(pax - bax * h, pay - bay * h);
}
// The mark's own geometry, in the 256 viewBox.
const sdSquare = (x, y, tight) =>
  tight ? sdRoundRect(x, y, 128, 128, 127, 127, 44) : sdRoundRect(x, y, 128, 128, 120, 120, 52);
const sdChevron = (x, y) =>
  Math.min(
    sdSegment(x, y, 83.36, 81.64, 129.73, 128),
    sdSegment(x, y, 129.73, 128, 83.36, 174.36)
  ) - 8.5;
const sdCursor = (x, y) => sdRoundRect(x, y, 164, 164, 22, 8, 8);

function over(dst, src, a) {
  const out = 1 - (1 - a) * (1 - dst[3]);
  if (out <= 0) return [0, 0, 0, 0];
  const w = a / out,
    v = (dst[3] * (1 - a)) / out;
  return [src[0] * w + dst[0] * v, src[1] * w + dst[1] * v, src[2] * w + dst[2] * v, out];
}

/** @param bleed true = ink fills the whole canvas (maskable / apple), false = rounded square. */
function render(size, { bleed = false, glyphScale = 1, tight = false } = {}) {
  const px = new Uint8Array(size * size * 4);
  const s = size / 256;
  const SS = 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let acc = [0, 0, 0, 0];
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / s;
          const v = (y + (sy + 0.5) / SS) / s;
          const gu = (u - 128) / glyphScale + 128;
          const gv = (v - 128) / glyphScale + 128;
          const cov = (d) => Math.max(0, Math.min(1, 0.5 - d * s));
          let c = [0, 0, 0, 0];
          c = over(c, INK, bleed ? 1 : cov(sdSquare(u, v, tight)));
          c = over(c, LIGHT, cov(sdChevron(gu, gv) * glyphScale));
          c = over(c, AMBER, cov(sdCursor(gu, gv) * glyphScale));
          acc = [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2], acc[3] + c[3]];
        }
      }
      const n = SS * SS,
        i = (y * size + x) * 4;
      px[i] = Math.round(acc[0] / n);
      px[i + 1] = Math.round(acc[1] / n);
      px[i + 2] = Math.round(acc[2] / n);
      px[i + 3] = Math.round((acc[3] / n) * 255);
    }
  }
  return px;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}
let TABLE = null;
function crc32(buf) {
  if (!TABLE) {
    TABLE = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      TABLE[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}
function png(size, px) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    Buffer.from(px.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
function ico(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  entries.forEach((e, i) => {
    const b = i * 16;
    dir[b] = e.size >= 256 ? 0 : e.size;
    dir[b + 1] = e.size >= 256 ? 0 : e.size;
    dir[b + 2] = 0;
    dir[b + 3] = 0;
    dir.writeUInt16LE(1, b + 4);
    dir.writeUInt16LE(32, b + 6);
    dir.writeUInt32LE(e.data.length, b + 8);
    dir.writeUInt32LE(offset, b + 12);
    offset += e.data.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.data)]);
}

const root = process.argv[2] ?? process.cwd();
const out = (rel, buf) => {
  fs.writeFileSync(path.join(root, rel), buf);
  console.log(rel, buf.length);
};

out('public/icons/icon-192x192.png', png(192, render(192)));
out('public/icons/icon-512x512.png', png(512, render(512)));
out(
  'public/icons/icon-maskable-512x512.png',
  png(512, render(512, { bleed: true, glyphScale: 1.15 }))
);
out('src/app/apple-icon.png', png(180, render(180, { bleed: true, glyphScale: 1.25 })));
out(
  'src/app/favicon.ico',
  ico(
    [16, 32, 48].map((size) => ({
      size,
      // A browser tab is 16px: the mark's own 8/256 inset and 52 radius eat the glyph alive at
      // that scale, so the favicon cut sits the square nearly flush and enlarges the chevron.
      data: png(size, render(size, { tight: true, glyphScale: 1.18 })),
    }))
  )
);
