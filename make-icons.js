// Draws the PNG app icons phones need, from the same design as icon.svg.
// Run with: node make-icons.js   (no packages needed)
const fs = require("fs");
const zlib = require("zlib");

const BLUE = [11, 92, 171], WHITE = [255, 255, 255], GREEN = [15, 122, 61];

// Signed distance to a rounded rectangle (negative = inside).
function rrect(px, py, x, y, w, h, r) {
  const cx = x + w / 2, cy = y + h / 2;
  const qx = Math.abs(px - cx) - (w / 2 - r), qy = Math.abs(py - cy) - (h / 2 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}
// Distance to a line segment.
function seg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

// Colour at a point in the 64×64 design. `full` = square background (iOS and Android mask it).
function shade(x, y, full) {
  const inBg = full ? (x >= 0 && x <= 64 && y >= 0 && y <= 64) : rrect(x, y, 0, 0, 64, 64, 14) <= 0;
  if (!inBg) return null;
  const check = Math.min(seg(x, y, 26, 33, 31, 38), seg(x, y, 31, 38, 39, 28));
  if (check <= 2) return GREEN;
  if (rrect(x, y, 20, 12, 24, 40, 10) <= 0) return WHITE;
  return BLUE;
}

// size in px; scale < 1 shrinks the artwork into the middle (safe zone for maskable icons).
function draw(size, full, scale = 1) {
  const S = 4; // 4×4 samples per pixel for smooth edges
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let py = 0; py < size; py++) {
    raw[py * (size * 4 + 1)] = 0;
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
        let x = ((px + (sx + 0.5) / S) / size) * 64, y = ((py + (sy + 0.5) / S) / size) * 64;
        x = 32 + (x - 32) / scale; y = 32 + (y - 32) / scale;
        let c = shade(x, y, full);
        if (!c && full) c = BLUE; // maskable: fill the bleed area
        if (c) { r += c[0]; g += c[1]; b += c[2]; a++; }
      }
      const o = py * (size * 4 + 1) + 1 + px * 4, n = S * S;
      raw[o] = a ? r / a : 0; raw[o + 1] = a ? g / a : 0; raw[o + 2] = a ? b / a : 0; raw[o + 3] = Math.round(255 * a / n);
    }
  }
  return png(size, raw);
}

function png(size, raw) {
  const crcTable = [...Array(256)].map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = buf => { let c = 0xffffffff; for (const x of buf) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

fs.writeFileSync("icon-192.png", draw(192, false));
fs.writeFileSync("icon-512.png", draw(512, false));
fs.writeFileSync("icon-maskable-512.png", draw(512, true, 0.8));
fs.writeFileSync("apple-touch-icon.png", draw(180, true));
console.log("Wrote icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png");
