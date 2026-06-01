// src/gotcha.js
// Renders a "make it a quote" style image: grayscale avatar fading into black,
// the quote centered on the right, attribution beneath.
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('node:path');
const fs = require('node:fs');

// Optional: drop a .ttf in assets/fonts to override the system font.
const fontPath = path.join(__dirname, '..', 'assets', 'fonts', 'Gotcha.ttf');
if (fs.existsSync(fontPath)) GlobalFonts.registerFromPath(fontPath, 'Gotcha');
const FONT = fs.existsSync(fontPath) ? 'Gotcha' : 'sans-serif';

const WIDTH = 1200;
const HEIGHT = 600;

async function makeGotcha({ text, authorName, avatarUrl }) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // 1. Black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // 2. Draw the avatar as a 600x600 square on the left
  const avatarSize = HEIGHT;
  try {
    const res = await fetch(avatarUrl);
    const buf = Buffer.from(await res.arrayBuffer());
    const avatar = await loadImage(buf);
    ctx.drawImage(avatar, 0, 0, avatarSize, avatarSize);
  } catch {
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, avatarSize, avatarSize);
  }

  // 3. Convert that region to grayscale (luminance)
  const region = ctx.getImageData(0, 0, avatarSize, avatarSize);
  const d = region.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = lum;
  }
  ctx.putImageData(region, 0, 0);

  // 4. Fade the avatar's right edge into the black background
  const fade = ctx.createLinearGradient(avatarSize - 280, 0, avatarSize, 0);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = fade;
  ctx.fillRect(avatarSize - 280, 0, 280, HEIGHT);

  // 5. Quote text on the right half
  const textW = WIDTH - avatarSize;
  const centerX = avatarSize + textW / 2;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const quote = `\u201C${text}\u201D`;
  const { lines, fontSize } = fitText(ctx, quote, textW - 80, HEIGHT - 200);
  const lineHeight = fontSize * 1.25;
  let y = HEIGHT / 2 - (lines.length * lineHeight) / 2 - 20;

  ctx.font = `600 ${fontSize}px ${FONT}`;
  for (const line of lines) {
    ctx.fillText(line, centerX, y);
    y += lineHeight;
  }

  // 6. Attribution
  ctx.font = `400 ${Math.round(fontSize * 0.6)}px ${FONT}`;
  ctx.fillStyle = '#aaaaaa';
  ctx.fillText(`\u2014 ${authorName}`, centerX, y + 24);

  // 7. Encode to PNG
  return await canvas.encode('png');
}

function fitText(ctx, text, maxWidth, maxHeight) {
  for (let size = 56; size >= 20; size -= 2) {
    ctx.font = `600 ${size}px ${FONT}`;
    const lines = wrap(ctx, text, maxWidth);
    if (lines.length * size * 1.25 <= maxHeight) return { lines, fontSize: size };
  }
  ctx.font = `600 20px ${FONT}`;
  return { lines: wrap(ctx, text, maxWidth), fontSize: 20 };
}

function wrap(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

module.exports = { makeGotcha };
