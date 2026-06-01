// src/gotcha.js
// Renders a "make it a quote" image: grayscale avatar fading into black, the quote
// (with inline emoji — both custom Discord emoji and standard unicode emoji drawn as
// Twemoji images) on the right, and attribution beneath.
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { parse: parseEmoji } = require('twemoji-parser');
const path = require('node:path');
const fs = require('node:fs');

// Optional: drop a .ttf in assets/fonts to override the system font.
const fontPath = path.join(__dirname, '..', 'assets', 'fonts', 'Gotcha.ttf');
if (fs.existsSync(fontPath)) GlobalFonts.registerFromPath(fontPath, 'Gotcha');
const FONT = fs.existsSync(fontPath) ? 'Gotcha' : 'sans-serif';

const WIDTH = 1200;
const HEIGHT = 600;
const CUSTOM_EMOJI_RE = /<(a)?:(\w+):(\d+)>/g; // <:name:id> and <a:name:id>

// Twemoji image (the same emoji set Discord renders) for a given codepoint string.
const twemojiUrl = (cp) => `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/72x72/${cp}.png`;

async function makeGotcha({ text, authorName, username, avatarUrl }) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // 1. Black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // 2. Draw the avatar as a 600x600 square on the left
  const avatarSize = HEIGHT;
  try {
    const res = await fetch(avatarUrl);
    const avatar = await loadImage(Buffer.from(await res.arrayBuffer()));
    ctx.drawImage(avatar, 0, 0, avatarSize, avatarSize);
  } catch {
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, avatarSize, avatarSize);
  }

  // 3. Convert the avatar region to grayscale (luminance)
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

  // 5. Build the quote as words + inline emoji images, wrap, and draw
  const items = await buildItems(text);

  const textW = WIDTH - avatarSize;
  const centerX = avatarSize + textW / 2;
  const { lines, fontSize } = fitText(ctx, items, textW - 80, HEIGHT - 200);

  const lineHeight = fontSize * 1.25;
  const emojiSize = fontSize;
  ctx.font = `600 ${fontSize}px ${FONT}`;
  const spaceW = ctx.measureText(' ').width;

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  let y = HEIGHT / 2 - (lines.length * lineHeight) / 2 - 20;
  for (const line of lines) {
    let x = centerX - line.width / 2; // center each line manually
    for (const item of line.items) {
      if (item.type === 'emoji') {
        ctx.drawImage(item.img, x, y - emojiSize / 2, emojiSize, emojiSize);
      } else {
        ctx.fillText(item.text, x, y);
      }
      x += item.w + spaceW;
    }
    y += lineHeight;
  }

  // 6. Attribution — display name, then the @username handle beneath it
  const nameSize = Math.round(fontSize * 0.6);
  ctx.textAlign = 'center';
  ctx.font = `400 ${nameSize}px ${FONT}`;
  ctx.fillStyle = '#dddddd';
  const nameY = y + 24;
  ctx.fillText(`- ${authorName}`, centerX, nameY);

  if (username) {
    const handleSize = Math.round(fontSize * 0.42);
    ctx.font = `400 ${handleSize}px ${FONT}`;
    ctx.fillStyle = '#888888';
    ctx.fillText(`@${username}`, centerX, nameY + nameSize * 1.1);
  }

  // 7. Encode to PNG
  return await canvas.encode('png');
}

// Split text into ordered runs of plain text and emoji (custom + unicode),
// then load each emoji image. Falls back to text if an image can't be fetched.
async function buildItems(text) {
  const tokens = tokenize(text);
  const items = [];
  for (const t of tokens) {
    if (t.type === 'text') {
      for (const word of t.value.split(/\s+/)) {
        if (word) items.push({ type: 'word', text: word });
      }
    } else {
      const img = await loadRemoteImage(t.url);
      if (img) items.push({ type: 'emoji', img });
      else items.push({ type: 'word', text: t.fallback });
    }
  }
  return items;
}

function tokenize(text) {
  const specials = [];

  // Custom Discord emoji
  CUSTOM_EMOJI_RE.lastIndex = 0;
  let m;
  while ((m = CUSTOM_EMOJI_RE.exec(text)) !== null) {
    specials.push({
      start: m.index,
      end: m.index + m[0].length,
      url: `https://cdn.discordapp.com/emojis/${m[3]}.png?size=64`,
      fallback: `:${m[2]}:`,
    });
  }

  // Standard unicode emoji (via twemoji-parser) -> Twemoji images
  for (const e of parseEmoji(text, { assetType: 'png', buildUrl: twemojiUrl })) {
    specials.push({ start: e.indices[0], end: e.indices[1], url: e.url, fallback: e.text });
  }

  specials.sort((a, b) => a.start - b.start);

  const tokens = [];
  let last = 0;
  for (const s of specials) {
    if (s.start < last) continue; // skip overlapping matches
    if (s.start > last) tokens.push({ type: 'text', value: text.slice(last, s.start) });
    tokens.push({ type: 'emoji', url: s.url, fallback: s.fallback });
    last = s.end;
  }
  if (last < text.length) tokens.push({ type: 'text', value: text.slice(last) });
  return tokens;
}

async function loadRemoteImage(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`emoji fetch HTTP ${res.status}: ${url}`);
      return null;
    }
    return await loadImage(Buffer.from(await res.arrayBuffer()));
  } catch (err) {
    console.warn(`emoji fetch failed (${url}): ${err.message}`);
    return null;
  }
}

// Shrink the font until the wrapped lines fit the box.
function fitText(ctx, items, maxWidth, maxHeight) {
  for (let size = 56; size >= 20; size -= 2) {
    ctx.font = `600 ${size}px ${FONT}`;
    const lines = layout(ctx, items, maxWidth, size);
    if (lines.length * size * 1.25 <= maxHeight) return { lines, fontSize: size };
  }
  ctx.font = `600 20px ${FONT}`;
  return { lines: layout(ctx, items, maxWidth, 20), fontSize: 20 };
}

// Greedy word-wrap that treats each emoji as a fixed-size box.
function layout(ctx, items, maxWidth, fontSize) {
  const spaceW = ctx.measureText(' ').width;
  const emojiSize = fontSize;
  const lines = [];
  let cur = [];
  let curW = 0;
  for (const item of items) {
    const w = item.type === 'emoji' ? emojiSize : ctx.measureText(item.text).width;
    const sep = cur.length ? spaceW : 0;
    if (cur.length && curW + sep + w > maxWidth) {
      lines.push({ items: cur, width: curW });
      cur = [{ ...item, w }];
      curW = w;
    } else {
      cur.push({ ...item, w });
      curW += sep + w;
    }
  }
  if (cur.length) lines.push({ items: cur, width: curW });
  return lines;
}

module.exports = { makeGotcha };
