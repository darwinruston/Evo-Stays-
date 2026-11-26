// Makes the browser tab icon and the picture shown when a link to the site is
// shared, from the Evo tick in public/. Run after changing either:
//
//   node scripts/brand/make-images.mjs
import { readFile, writeFile } from "fs/promises";
import sharp from "sharp";

// ---- the tab icon: src/app/favicon.ico ----

// The tick with little margin, so it can still be made out at 16 pixels.
const tick = await sharp("public/icons/icon-512.png").trim().toBuffer();
async function square(size) {
  const mark = await sharp(tick)
    .resize({ width: Math.round(size * 0.82), height: Math.round(size * 0.82), fit: "contain", background: "#00000000" })
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: "#ffffff" } })
    .composite([{ input: mark, gravity: "center", blend: "multiply" }])
    .png()
    .toBuffer();
}

// An .ico is a short index followed by the pictures, here as PNGs.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(square));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((size, i) => {
  const at = 6 + 16 * i;
  header.writeUInt8(size, at);
  header.writeUInt8(size, at + 1);
  header.writeUInt16LE(1, at + 4);
  header.writeUInt16LE(32, at + 6);
  header.writeUInt32LE(images[i].length, at + 8);
  header.writeUInt32LE(offset, at + 12);
  offset += images[i].length;
});
await writeFile("src/app/favicon.ico", Buffer.concat([header, ...images]));

// ---- the shared-link picture: src/app/opengraph-image.png ----

const white = await sharp(await readFile("public/branding/evo-tick-white.png")).resize({ height: 150 }).toBuffer();
const card = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#042f2e"/><stop offset="0.55" stop-color="#115e59"/><stop offset="1" stop-color="#075985"/>
  </linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <g font-family="Segoe UI, Helvetica, Arial" fill="#ffffff">
    <text x="90" y="370" font-size="88" font-weight="700">Evo Stays</text>
    <text x="90" y="450" font-size="40" font-weight="600" fill="#a7f3d0">Software that works for you</text>
    <text x="90" y="520" font-size="30" fill="#e0f2fe">Cleans, codes, safety dates and linen for short-let teams, in one place</text>
  </g>
</svg>`;
await sharp(Buffer.from(card))
  .composite([{ input: white, left: 90, top: 100 }])
  .png()
  .toFile("src/app/opengraph-image.png");
await writeFile("src/app/opengraph-image.alt.txt", "Evo Stays: software that works for you, for short-let teams");
console.log("Made src/app/favicon.ico and src/app/opengraph-image.png");
