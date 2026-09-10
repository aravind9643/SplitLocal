/**
 * Generates every app icon from one vector source.
 *   node scripts/make-icons.mjs
 *
 * Mark: a receipt with its lines, cut by a clean vertical gap into two
 * unequal halves — a bill divided between people. Deliberately avoids a
 * ring-with-a-diagonal (reads as "prohibited") and avoids thin detail, so it
 * survives a 48px favicon and a flat silhouette (Android themed icons /
 * iOS tinted mode).
 */
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = 'assets';
const BRAND = { light: '#1CC29F', mid: '#12A5B0' };

const GRAD = `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="${BRAND.light}"/><stop offset="1" stop-color="${BRAND.mid}"/>
</linearGradient>`;

/**
 * Two rounded tablets (the two shares) side by side with a gap between them,
 * the left one taller/fuller and the right one shorter — an amount split
 * unevenly. Each carries line marks so it reads as a bill, not just a block.
 *
 * One flat colour, big shapes, generous gap: legible tiny and as a silhouette.
 */
const glyph = (fill) => `
  <g fill="${fill}" fill-rule="evenodd">
    <!--
      One receipt, cut by a vertical gap into a wide left half and a narrow
      right half. Both halves share the same top/bottom edge and the line
      items run straight through the cut, so the eye reads one bill divided
      rather than two separate objects.
    -->
    <!-- left half of the receipt -->
    <path d="
      M132 96 h130 v320 H132 a26 26 0 0 1-26-26 V122 a26 26 0 0 1 26-26 z
      M150 168 h94  a16 16 0 0 1 0 32 h-94 a16 16 0 0 1 0-32 z
      M150 240 h94  a16 16 0 0 1 0 32 h-94 a16 16 0 0 1 0-32 z
      M150 312 h56  a16 16 0 0 1 0 32 h-56 a16 16 0 0 1 0-32 z
    "/>
    <!-- right half: same height, narrower, line items continue across -->
    <path d="
      M290 96 h90 a26 26 0 0 1 26 26 v268 a26 26 0 0 1-26 26 h-90 z
      M308 168 h54 a16 16 0 0 1 0 32 h-54 a16 16 0 0 1 0-32 z
      M308 240 h54 a16 16 0 0 1 0 32 h-54 a16 16 0 0 1 0-32 z
    "/>
  </g>
`;

/**
 * The glyph's own bounding box inside the 512 viewBox — the paths span
 * x 106..406 and y 96..416, so it is not centred and does not fill the canvas.
 * Normalising by this lets `fill` below mean "fraction of the canvas the mark
 * should occupy", which is what the platform guidance is actually expressed in.
 */
const BOX = { x: 106, y: 96, w: 300, h: 320 };

/**
 * @param fill    mark paint
 * @param bg      'gradient' | hex | null (transparent)
 * @param span    fraction of the canvas the mark should span (its longest side)
 * @param rounded backdrop corner radius
 */
function svg({ fill = '#FFFFFF', bg = 'gradient', span = 0.62, rounded = 112 } = {}) {
  // scale so the glyph's longest side becomes `span` of 512, then centre it
  const s = (512 * span) / Math.max(BOX.w, BOX.h);
  const tx = (512 - BOX.w * s) / 2 - BOX.x * s;
  const ty = (512 - BOX.h * s) / 2 - BOX.y * s;
  const backdrop =
    bg === null
      ? ''
      : `<rect width="512" height="512" rx="${rounded}" fill="${
          bg === 'gradient' ? 'url(#g)' : bg
        }"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<defs>${GRAD}</defs>
${backdrop}
<g transform="translate(${tx} ${ty}) scale(${s})">${glyph(fill)}</g>
</svg>`;
}

const render = (markup, size, opts = {}) => {
  let p = sharp(Buffer.from(markup), { density: 384 }).resize(size, size);
  if (opts.flatten) p = p.flatten({ background: opts.flatten });
  return p.png().toBuffer();
};

const write = async (name, buf) => {
  await writeFile(join(OUT, name), buf);
  const m = await sharp(buf).metadata();
  console.log(
    `  ${name.padEnd(30)} ${`${m.width}x${m.height}`.padEnd(11)} ` +
      `alpha=${m.hasAlpha ? 'yes' : 'no '}  ${(buf.length / 1024).toFixed(1)} KB`
  );
};

console.log('Generating icons…');

// iOS / store icon — full-bleed square; ~58% keeps margin inside the mask.
await write(
  'icon.png',
  await render(svg({ bg: 'gradient', rounded: 0, span: 0.58 }), 1024, { flatten: BRAND.light })
);
// Favicon — 96px so browsers downscale cleanly to 16/32; the mark spans a
// touch more of the tile because a tab icon has no room for wide margins.
await write('favicon.png', await render(svg({ bg: 'gradient', rounded: 96, span: 0.66 }), 96));

// PWA install icons (referenced from app.json web.manifest).
await write('web-icon-192.png', await render(svg({ bg: 'gradient', rounded: 42, span: 0.62 }), 192));
await write('web-icon-512.png', await render(svg({ bg: 'gradient', rounded: 112, span: 0.62 }), 512));
// Maskable variant: Android PWA masks crop to a circle, so keep the mark small
// enough to survive the crop and let the background bleed to the edges.
await write(
  'web-icon-maskable-512.png',
  await render(svg({ bg: 'gradient', rounded: 0, span: 0.46 }), 512)
);
// Splash — mark alone on the brand background.
await write('splash-icon.png', await render(svg({ bg: null, span: 0.5 }), 1024));
// Android adaptive foreground — 62% fills the launcher mask without clipping
// (the outer ~17% on each side can be cropped by aggressive OEM masks).
await write('android-icon-foreground.png', await render(svg({ bg: null, span: 0.62 }), 512));
await write(
  'android-icon-background.png',
  await render(
    `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<defs>${GRAD}</defs><rect width="512" height="512" fill="url(#g)"/></svg>`,
    512
  )
);
await write(
  'android-icon-monochrome.png',
  await render(svg({ fill: '#FFFFFF', bg: null, span: 0.62 }), 432)
);

console.log('Done.');
