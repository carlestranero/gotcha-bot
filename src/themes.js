// src/themes.js
// 22 visual themes for quote images. Each theme defines background rendering,
// text colors, and attribution colors.

const THEMES = [
  {
    id: 'black_white',
    name: 'Black/White',
    background: { type: 'solid', color: '#000000' },
    textColor: '#ffffff',
    nameColor: '#dddddd',
    handleColor: '#888888',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    background: {
      type: 'gradient', angle: 135,
      stops: [['#c72c41', 0], ['#d94e1f', 0.5], ['#e8751a', 1]],
    },
    textColor: '#ffffff',
    nameColor: '#ffe8d6',
    handleColor: '#ddb89a',
  },
  {
    id: 'chroma_glow',
    name: 'Chroma Glow',
    background: {
      type: 'gradient', angle: 135,
      stops: [['#8e2de2', 0], ['#4a00e0', 0.3], ['#0575e6', 0.6], ['#00d2ff', 1]],
    },
    textColor: '#ffffff',
    nameColor: '#e0e8ff',
    handleColor: '#a8b8dd',
  },
  {
    id: 'forest',
    name: 'Forest',
    background: {
      type: 'gradient', angle: 180,
      stops: [['#0b3d0b', 0], ['#1a5c2a', 0.5], ['#0d2b0d', 1]],
    },
    textColor: '#d4edda',
    nameColor: '#a8d5a8',
    handleColor: '#6b9a6b',
  },
  {
    id: 'crimson_moon',
    name: 'Crimson Moon',
    background: {
      type: 'gradient', angle: 180,
      stops: [['#1a0000', 0], ['#4a0e0e', 0.5], ['#2d0000', 1]],
    },
    textColor: '#ff6b6b',
    nameColor: '#cc5555',
    handleColor: '#8b3a3a',
  },
  {
    id: 'midnight_blurple',
    name: 'Midnight Blurple',
    background: {
      type: 'gradient', angle: 135,
      stops: [['#1a1a40', 0], ['#2c2f6e', 0.6], ['#5865f2', 1]],
    },
    textColor: '#ffffff',
    nameColor: '#c8c8ff',
    handleColor: '#8888cc',
  },
  {
    id: 'mars',
    name: 'Mars',
    background: {
      type: 'gradient', angle: 135,
      stops: [['#4a1a0a', 0], ['#8b3a1a', 0.5], ['#5c2510', 1]],
    },
    textColor: '#ffccaa',
    nameColor: '#cc9977',
    handleColor: '#997755',
  },
  {
    id: 'dusk',
    name: 'Dusk',
    background: {
      type: 'gradient', angle: 180,
      stops: [['#1a0a3a', 0], ['#2b1055', 0.4], ['#4a1a7a', 1]],
    },
    textColor: '#e8d5ff',
    nameColor: '#c4a8e0',
    handleColor: '#8877aa',
  },
  {
    id: 'under_the_sea',
    name: 'Under the Sea',
    background: {
      type: 'gradient', angle: 180,
      stops: [['#001a2c', 0], ['#003355', 0.5], ['#005577', 1]],
    },
    textColor: '#aaeeff',
    nameColor: '#88ccdd',
    handleColor: '#558899',
  },
  {
    id: 'retro_storm',
    name: 'Retro Storm',
    background: {
      type: 'gradient', angle: 135,
      stops: [['#1a1a2e', 0], ['#16213e', 0.5], ['#0f3460', 1]],
    },
    textColor: '#e0e0ff',
    nameColor: '#a8a8cc',
    handleColor: '#7070aa',
  },
  {
    id: 'neon_nights',
    name: 'Neon Nights',
    background: {
      type: 'gradient', angle: 135,
      stops: [['#0a0a1a', 0], ['#1a0a2e', 0.5], ['#0a0a1a', 1]],
    },
    textColor: '#f0e0ff',
    nameColor: '#ff69b4',
    handleColor: '#00bfff',
  },
  {
    id: 'strawberry_lemonade',
    name: 'Strawberry Lemonade',
    background: {
      type: 'gradient', angle: 135,
      stops: [['#8b1a4a', 0], ['#a83279', 0.5], ['#c77d1a', 1]],
    },
    textColor: '#ffffff',
    nameColor: '#ffd6e8',
    handleColor: '#ddaacc',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    background: {
      type: 'gradient', angle: 135,
      stops: [['#0a2a1a', 0], ['#0d4a3a', 0.3], ['#0a3a5a', 0.6], ['#2a1a4a', 1]],
    },
    textColor: '#88ffaa',
    nameColor: '#66dd88',
    handleColor: '#449966',
  },
  {
    id: 'sepia',
    name: 'Sepia',
    background: {
      type: 'gradient', angle: 135,
      stops: [['#3c2415', 0], ['#5c3a25', 0.5], ['#4a2e1a', 1]],
    },
    textColor: '#f5e6d3',
    nameColor: '#d4c4a8',
    handleColor: '#9a8a6a',
  },
  {
    id: 'mint_apple',
    name: 'Mint Apple',
    background: {
      type: 'gradient', angle: 135,
      stops: [['#0d3320', 0], ['#1a5c3a', 0.5], ['#0d4a2a', 1]],
    },
    textColor: '#e0fff0',
    nameColor: '#a8ddc4',
    handleColor: '#70aa8c',
  },
  {
    id: 'citrus_sherbert',
    name: 'Citrus Sherbert',
    background: {
      type: 'gradient', angle: 135,
      stops: [['#8b4a00', 0], ['#a86800', 0.4], ['#887a00', 0.7], ['#4a7a2a', 1]],
    },
    textColor: '#fff8e0',
    nameColor: '#ddd8a8',
    handleColor: '#aaa870',
  },
  {
    id: 'retro_raincloud',
    name: 'Retro Raincloud',
    background: {
      type: 'gradient', angle: 180,
      stops: [['#2c3e50', 0], ['#3d566e', 0.5], ['#4a6a87', 1]],
    },
    textColor: '#ecf0f1',
    nameColor: '#bdc3c7',
    handleColor: '#7f8c8d',
  },
  {
    id: 'hanami',
    name: 'Hanami',
    background: {
      type: 'gradient', angle: 135,
      stops: [['#3a1a2a', 0], ['#6b2a50', 0.5], ['#8b4a6b', 1]],
    },
    textColor: '#ffd5e5',
    nameColor: '#ffaac4',
    handleColor: '#cc7799',
  },
  {
    id: 'sunrise',
    name: 'Sunrise',
    background: {
      type: 'gradient', angle: 90,
      stops: [['#1a0a30', 0], ['#7a2a1a', 0.4], ['#c76a15', 0.7], ['#c7981a', 1]],
    },
    textColor: '#ffffff',
    nameColor: '#fff5e6',
    handleColor: '#ddccaa',
  },
  {
    id: 'cotton_candy',
    name: 'Cotton Candy',
    background: {
      type: 'gradient', angle: 135,
      stops: [['#5a2a5a', 0], ['#7a3a6a', 0.5], ['#3a4a7a', 1]],
    },
    textColor: '#ffd6f0',
    nameColor: '#ddaadd',
    handleColor: '#aa88bb',
  },
  {
    id: 'lofi_vibes',
    name: 'LoFi Vibes',
    background: {
      type: 'gradient', angle: 135,
      stops: [['#2a1a15', 0], ['#3a2a25', 0.5], ['#2a2025', 1]],
    },
    textColor: '#e8d8c8',
    nameColor: '#c4a888',
    handleColor: '#8a7a6a',
  },
  {
    id: 'desert_khaki',
    name: 'Desert Khaki',
    background: {
      type: 'gradient', angle: 135,
      stops: [['#3a3020', 0], ['#5c4a30', 0.5], ['#4a3e28', 1]],
    },
    textColor: '#f0e8d0',
    nameColor: '#c4b898',
    handleColor: '#8a7e60',
  },
];

const THEME_MAP = new Map(THEMES.map((t) => [t.id, t]));

function getTheme(id) {
  return THEME_MAP.get(id) || THEMES[0];
}

function getDefaultTheme() {
  return THEMES[0];
}

function drawBackground(ctx, theme, width, height) {
  const bg = theme.background;
  if (bg.type === 'solid') {
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, width, height);
    return;
  }
  const rad = (bg.angle * Math.PI) / 180;
  const diag = Math.sqrt(width * width + height * height) / 2;
  const cx = width / 2;
  const cy = height / 2;
  const grad = ctx.createLinearGradient(
    cx - Math.cos(rad) * diag, cy - Math.sin(rad) * diag,
    cx + Math.cos(rad) * diag, cy + Math.sin(rad) * diag,
  );
  for (const [color, pos] of bg.stops) grad.addColorStop(pos, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

module.exports = { THEMES, getTheme, getDefaultTheme, drawBackground };
