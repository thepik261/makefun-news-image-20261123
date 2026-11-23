// News image for Monday 23 November 2026: a newspaper front page drawn from
// scratch with the standard library only. It names the day and its biggest
// stories, verified against the day's reporting (Just Security Early Edition,
// 23 Nov 2026, and other outlets): the Iran war, COP31's collapse, Gaza,
// Ukraine, the West Bank, and the Sinaloa cartel capture.
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const W = 1024, H = 1024;
const OUT = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// 5x7 pixel font: each glyph is 7 rows of 5 bits (numbers 0-31).
const F: Record<string, number[]> = {
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  '0': [14, 17, 19, 21, 25, 17, 14], '1': [4, 12, 4, 4, 4, 4, 14],
  '2': [14, 17, 1, 6, 8, 16, 31], '3': [31, 2, 4, 2, 1, 17, 14],
  '4': [2, 6, 10, 18, 31, 2, 2], '5': [31, 16, 30, 1, 1, 17, 14],
  '6': [6, 8, 16, 30, 17, 17, 14], '7': [31, 1, 2, 4, 8, 8, 8],
  '8': [14, 17, 17, 14, 17, 17, 14], '9': [14, 17, 17, 15, 1, 2, 12],
  ' ': [0, 0, 0, 0, 0, 0, 0], '.': [0, 0, 0, 0, 0, 12, 12],
  ',': [0, 0, 0, 0, 12, 4, 8], ':': [0, 12, 12, 0, 12, 12, 0],
  ';': [0, 12, 12, 0, 12, 4, 8], "'": [4, 4, 8, 0, 0, 0, 0],
  '"': [10, 10, 0, 0, 0, 0, 0], '-': [0, 0, 0, 14, 0, 0, 0],
  '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8],
  '/': [1, 2, 2, 4, 8, 8, 16], '%': [25, 26, 2, 4, 8, 11, 19],
  '&': [12, 18, 20, 8, 21, 18, 13], '!': [4, 4, 4, 4, 4, 0, 4],
  '?': [14, 17, 1, 6, 4, 0, 4],
};
const NAVY: [number, number, number] = [15, 42, 74];
const RED: [number, number, number] = [178, 34, 34];
const INK: [number, number, number] = [24, 24, 24];
const GREY: [number, number, number] = [110, 110, 110];
const LIGHT: [number, number, number] = [238, 238, 238];
const WHITE: [number, number, number] = [255, 255, 255];

const px = new Uint8Array(W * H * 3).fill(255);
function rect(x: number, y: number, w: number, h: number, c: [number, number, number]) {
  for (let j = Math.max(0, y); j < Math.min(H, y + h); j++)
    for (let i = Math.max(0, x); i < Math.min(W, x + w); i++) {
      const o = (j * W + i) * 3; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2];
    }
}
function text(s: string, x: number, y: number, sc: number, c: [number, number, number]) {
  let cx = x;
  for (const ch of s.toUpperCase()) {
    const g = F[ch] ?? F['?'];
    for (let r = 0; r < 7; r++) for (let col = 0; col < 5; col++)
      if (g[r] & (16 >> col)) rect(cx + col * sc, y + r * sc, sc, sc, c);
    cx += 6 * sc;
  }
  return cx;
}
function textW(s: string, sc: number) { return s.length * 6 * sc - sc; }
function wrap(s: string, sc: number, maxW: number): string[] {
  const words = s.split(' '); const lines: string[] = []; let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (textW(t, sc) <= maxW) cur = t;
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

// Banner.
rect(0, 0, W, 140, NAVY);
text('MONDAY 23 NOVEMBER 2026', 32, 22, 4, WHITE);
text('THE DAY IN NEWS', 32, 84, 2, [200, 210, 225]);

const stories: { k: string; h: string; b: string; c: [number, number, number] }[] = [
  { k: 'IRAN WAR', h: 'TRUMP: IRAN WANTS A DEAL, NOT AN ACCEPTABLE ONE', b: 'Iran hits a US base in Bahrain, wounding two; three tankers are struck in the Strait of Hormuz.', c: RED },
  { k: 'CLIMATE', h: 'COP31 ENDS WITH NO DEAL IN TURKEY', b: 'The longest climate talks in history collapse over fossil fuels and money.', c: [34, 120, 70] },
  { k: 'GAZA', h: 'STRIKE KILLS THREE IN GAZA; 99% TOXIC, OXFAM SAYS', b: 'A truck is hit in Gaza; a new report finds toxic contamination across nearly all of the territory.', c: [120, 70, 20] },
  { k: 'UKRAINE', h: 'RUSSIAN STRIKES KILL A CHILD IN KRYVYI RIH', b: 'A young woman is also killed; 14 people are missing after a drone strike near Kyiv.', c: [40, 90, 160] },
  { k: 'WEST BANK', h: 'EISENKOT CALLS SETTLER ARSON JEWISH TERRORISM', b: 'The prime minister-elect condemns arson attacks on Palestinian villages near Ramallah.', c: [110, 40, 120] },
  { k: 'MEXICO', h: 'CARTEL BOSS CHAPO ISIDRO CAPTURED', b: 'Mexican forces capture the Sinaloa leader after a deadly firefight; the US had sought him.', c: [20, 110, 110] },
];
let y = 156;
for (const s of stories) {
  rect(24, y, W - 48, 124, WHITE);
  rect(24, y, W - 48, 2, LIGHT); rect(24, y + 122, W - 48, 2, LIGHT);
  rect(24, y, 14, 124, s.c);
  text(s.k, 58, y + 10, 2, s.c);
  text(s.h, 58, y + 36, 3, INK);
  const lines = wrap(s.b, 2, W - 58 - 24 - 20);
  lines.slice(0, 2).forEach((ln, i) => text(ln, 58, y + 74 + i * 18, 2, GREY));
  y += 138;
}
text('SOURCES: JUST SECURITY EARLY EDITION, REUTERS, OXFAM - 23 NOV 2026', 32, 994, 1, GREY);

// PNG encode (stdlib zlib + hand-rolled CRC32).
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c; }
function crc(b: Buffer): number { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, cr]);
}
const raw = Buffer.alloc(H * (1 + W * 3));
for (let j = 0; j < H; j++) { raw[j * (1 + W * 3)] = 0; raw.set(px.subarray(j * W * 3, (j + 1) * W * 3), j * (1 + W * 3) + 1); }
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
]);
mkdirSync(OUT, { recursive: true });
writeFileSync(OUT + '/entry.png', png);
