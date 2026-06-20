// src/gotcha.js
// Renders a "make it a quote" image: grayscale avatar fading into a themed
// background, the quote (with inline emoji — custom Discord emoji and unicode
// emoji drawn as Twemoji images) on the right, attribution beneath.
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { parse: parseEmoji } = require('twemoji-parser');
const { getDefaultTheme, drawBackground } = require('./themes');
const { getFontFamily, getDefaultFont } = require('./fonts');

const WIDTH = 1200;
const HEIGHT = 600;
const MIN_SIZE = 20;
const CUSTOM_EMOJI_RE = /<(a)?:(\w+):(\d+)>/g;
const twemojiUrl = (cp) => `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/72x72/${cp}.png`;

async function makeGotcha({ text, authorName, username, avatarUrl, theme, fontId }) {
  theme = theme || getDefaultTheme();
  const fontFamily = fontId ? getFontFamily(fontId) : getFontFamily(getDefaultFont().id);

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // 1. Draw themed background across the full canvas
  drawBackground(ctx, theme, WIDTH, HEIGHT);

  // 2. Render and grayscale the avatar on a temporary canvas
  const avatarSize = HEIGHT;
  const avatarCanvas = createCanvas(avatarSize, avatarSize);
  const actx = avatarCanvas.getContext('2d');

  try {
    const res = await fetch(avatarUrl);
    const avatar = await loadImage(Buffer.from(await res.arrayBuffer()));
    actx.drawImage(avatar, 0, 0, avatarSize, avatarSize);
  } catch {
    actx.fillStyle = '#111111';
    actx.fillRect(0, 0, avatarSize, avatarSize);
  }

  // 3. Grayscale the avatar
  const region = actx.getImageData(0, 0, avatarSize, avatarSize);
  const d = region.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = lum;
  }
  actx.putImageData(region, 0, 0);

  // 4. Fade the avatar's right edge to transparent (works with any background)
  actx.globalCompositeOperation = 'destination-out';
  const fadeGrad = actx.createLinearGradient(avatarSize - 280, 0, avatarSize, 0);
  fadeGrad.addColorStop(0, 'rgba(0,0,0,0)');
  fadeGrad.addColorStop(1, 'rgba(0,0,0,1)');
  actx.fillStyle = fadeGrad;
  actx.fillRect(avatarSize - 280, 0, 280, avatarSize);

  // 5. Composite the faded avatar over the themed background
  ctx.drawImage(avatarCanvas, 0, 0);

  // 6. Build the quote as words + inline emoji images, wrap, and draw
  const items = await buildItems(text);
  const textW = WIDTH - avatarSize;
  const centerX = avatarSize + textW / 2;
  const { lines, fontSize } = fitText(ctx, items, textW - 80, HEIGHT - 200, fontFamily);
  const lineHeight = fontSize * 1.25;
  const emojiSize = fontSize;

  ctx.font = `600 ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = theme.textColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  let y = HEIGHT / 2 - (lines.length * lineHeight) / 2 - 20;
  for (const line of lines) {
    let x = centerX - line.width / 2;
    for (const item of line.items) {
      x += item.sep;
      if (item.type === 'emoji') ctx.drawImage(item.img, x, y - emojiSize / 2, emojiSize, emojiSize);
      else ctx.fillText(item.text, x, y);
      x += item.w;
    }
    y += lineHeight;
  }

  // 7. Attribution — display name, then @username
  const nameSize = Math.round(fontSize * 0.6);
  ctx.textAlign = 'center';
  ctx.font = `400 ${nameSize}px ${fontFamily}`;
  ctx.fillStyle = theme.nameColor;
  const nameY = y + 24;
  ctx.fillText(`- ${authorName}`, centerX, nameY);

  if (username) {
    const handleSize = Math.round(fontSize * 0.42);
    ctx.font = `400 ${handleSize}px ${fontFamily}`;
    ctx.fillStyle = theme.handleColor;
    ctx.fillText(`@${username}`, centerX, nameY + nameSize * 1.1);
  }

  return await canvas.encode('png');
}

// ---- text -> items (words + emoji images) ----
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
  CUSTOM_EMOJI_RE.lastIndex = 0;
  let m;
  while ((m = CUSTOM_EMOJI_RE.exec(text)) !== null) {
    specials.push({ start: m.index, end: m.index + m[0].length, url: `https://cdn.discordapp.com/emojis/${m[3]}.png?size=64`, fallback: `:${m[2]}:` });
  }
  for (const e of parseEmoji(text, { assetType: 'png', buildUrl: twemojiUrl })) {
    specials.push({ start: e.indices[0], end: e.indices[1], url: e.url, fallback: e.text });
  }
  specials.sort((a, b) => a.start - b.start);

  const tokens = [];
  let last = 0;
  for (const s of specials) {
    if (s.start < last) continue;
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
    if (!res.ok) { console.warn(`emoji fetch HTTP ${res.status}: ${url}`); return null; }
    return await loadImage(Buffer.from(await res.arrayBuffer()));
  } catch (err) {
    console.warn(`emoji fetch failed (${url}): ${err.message}`);
    return null;
  }
}

// ---- layout ----
function fitText(ctx, items, maxWidth, maxHeight, fontFamily) {
  let smallest = null;
  for (let size = 56; size >= MIN_SIZE; size -= 2) {
    ctx.font = `600 ${size}px ${fontFamily}`;
    const lines = layout(ctx, items, maxWidth, size);
    if (lines.length * size * 1.25 <= maxHeight) return { lines, fontSize: size };
    smallest = { lines, fontSize: size };
  }
  const { lines, fontSize } = smallest;
  ctx.font = `600 ${fontSize}px ${fontFamily}`;
  const maxLines = Math.max(1, Math.floor(maxHeight / (fontSize * 1.25)));
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    const last = kept[maxLines - 1];
    const ell = '…';
    const w = ctx.measureText(ell).width;
    last.items.push({ type: 'word', text: ell, w, sep: 0 });
    last.width += w;
    return { lines: kept, fontSize };
  }
  return { lines, fontSize };
}

function layout(ctx, items, maxWidth, fontSize) {
  const spaceW = ctx.measureText(' ').width;
  const emojiSize = fontSize;
  const work = expand(ctx, items, maxWidth);
  const lines = [];
  let cur = [];
  let curW = 0;
  for (const raw of work) {
    const w = raw.type === 'emoji' ? emojiSize : ctx.measureText(raw.text).width;
    const sep = (cur.length === 0 || raw.glue) ? 0 : spaceW;
    if (cur.length && curW + sep + w > maxWidth) {
      lines.push({ items: cur, width: curW });
      cur = [{ ...raw, w, sep: 0 }];
      curW = w;
    } else {
      cur.push({ ...raw, w, sep });
      curW += sep + w;
    }
  }
  if (cur.length) lines.push({ items: cur, width: curW });
  return lines;
}

function expand(ctx, items, maxWidth) {
  const out = [];
  for (const item of items) {
    if (item.type === 'word' && ctx.measureText(item.text).width > maxWidth) {
      breakWord(ctx, item.text, maxWidth).forEach((piece, i) =>
        out.push({ type: 'word', text: piece, glue: i > 0 }));
    } else {
      out.push(item);
    }
  }
  return out;
}

function breakWord(ctx, word, maxWidth) {
  const pieces = [];
  let piece = '';
  for (const ch of word) {
    if (piece && ctx.measureText(piece + ch).width > maxWidth) {
      pieces.push(piece);
      piece = ch;
    } else {
      piece += ch;
    }
  }
  if (piece) pieces.push(piece);
  return pieces;
}

module.exports = { makeGotcha };
