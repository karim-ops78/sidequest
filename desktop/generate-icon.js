// Generates assets/icon.png (a purple rounded compass dot) with zero deps.
// Hand-rolls a valid PNG: signature + IHDR + IDAT (zlib) + IEND, with CRC32.
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const SIZE = 32;
const ACCENT = [124, 92, 255]; // #7c5cff

// CRC32 (standard table-based).
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

// Build RGBA pixels: a filled circle on transparent background.
const cx = SIZE / 2 - 0.5;
const cy = SIZE / 2 - 0.5;
const r = SIZE / 2 - 1;
const raw = Buffer.alloc(SIZE * (1 + SIZE * 4));
for (let y = 0; y < SIZE; y++) {
  const rowStart = y * (1 + SIZE * 4);
  raw[rowStart] = 0; // filter byte: none
  for (let x = 0; x < SIZE; x++) {
    const o = rowStart + 1 + x * 4;
    const d = Math.hypot(x - cx, y - cy);
    const inside = d <= r;
    raw[o] = ACCENT[0];
    raw[o + 1] = ACCENT[1];
    raw[o + 2] = ACCENT[2];
    raw[o + 3] = inside ? 255 : 0;
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
// 10,11,12 = 0 (compression, filter, interlace)

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(raw)),
  chunk("IEND", Buffer.alloc(0)),
]);

const outDir = path.join(__dirname, "assets");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "icon.png"), png);
console.log("Wrote assets/icon.png");
