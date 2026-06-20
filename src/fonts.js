// src/fonts.js
// Font configuration, registration, and lookup for the 18 supported fonts.
const { GlobalFonts } = require('@napi-rs/canvas');
const path = require('node:path');
const fs = require('node:fs');

const FONT_DIR = path.join(__dirname, '..', 'assets', 'fonts');

const FONTS = [
  { id: 'inconsolata',        name: 'Inconsolata',        file: 'Inconsolata.ttf',       family: 'Inconsolata',       google: 'Inconsolata',        weight: 700 },
  { id: 'mplus_rounded_1c',   name: 'M PLUS Rounded 1c',  file: 'MPLUSRounded1c.ttf',    family: 'MPLUSRounded1c',    google: 'M+PLUS+Rounded+1c',  weight: 700 },
  { id: 'dela_gothic_one',    name: 'Dela Gothic One',    file: 'DelaGothicOne.ttf',     family: 'DelaGothicOne',     google: 'Dela+Gothic+One',    weight: 400 },
  { id: 'dotgothic16',        name: 'DotGothic16',        file: 'DotGothic16.ttf',       family: 'DotGothic16',       google: 'DotGothic16',        weight: 400 },
  { id: 'hachi_maru_pop',     name: 'Hachi Maru Pop',     file: 'HachiMaruPop.ttf',      family: 'HachiMaruPop',      google: 'Hachi+Maru+Pop',     weight: 400 },
  { id: 'rampart_one',        name: 'Rampart One',        file: 'RampartOne.ttf',         family: 'RampartOne',        google: 'Rampart+One',        weight: 400 },
  { id: 'reggae_one',         name: 'Reggae One',         file: 'ReggaeOne.ttf',          family: 'ReggaeOne',         google: 'Reggae+One',         weight: 400 },
  { id: 'rocknroll_one',      name: 'RocknRoll One',      file: 'RocknRollOne.ttf',       family: 'RocknRollOne',      google: 'RocknRoll+One',      weight: 400 },
  { id: 'zen_old_mincho',     name: 'Zen Old Mincho',     file: 'ZenOldMincho.ttf',       family: 'ZenOldMincho',      google: 'Zen+Old+Mincho',     weight: 700 },
  { id: 'yuji_syuku',         name: 'Yuji Syuku',         file: 'YujiSyuku.ttf',          family: 'YujiSyuku',         google: 'Yuji+Syuku',         weight: 400 },
  { id: 'yusei_magic',        name: 'Yusei Magic',        file: 'YuseiMagic.ttf',         family: 'YuseiMagic',        google: 'Yusei+Magic',        weight: 400 },
  { id: 'jiyu_no_tsubasa',    name: 'Jiyu no Tsubasa',    file: 'JiyuNoTsubasa.ttf',      family: 'JiyuNoTsubasa',     google: null,                 weight: 400 },
  { id: 'exo_2',              name: 'Exo 2',              file: 'Exo2.ttf',               family: 'Exo2',              google: 'Exo+2',              weight: 700 },
  { id: 'bruno_ace_sc',       name: 'Bruno Ace SC',       file: 'BrunoAceSC.ttf',         family: 'BrunoAceSC',        google: 'Bruno+Ace+SC',       weight: 400 },
  { id: 'castoro_titling',    name: 'Castoro Titling',    file: 'CastoroTitling.ttf',     family: 'CastoroTitling',    google: 'Castoro+Titling',    weight: 400 },
  { id: 'poltawski_nowy',     name: 'Poltawski Nowy',     file: 'PoltawskiNowy.ttf',      family: 'PoltawskiNowy',     google: 'Poltawski+Nowy',     weight: 700 },
  { id: 'vina_sans',          name: 'Vina Sans',          file: 'VinaSans.ttf',            family: 'VinaSans',          google: 'Vina+Sans',          weight: 400 },
  { id: 'dancing_script',     name: 'Dancing Script',     file: 'DancingScript.ttf',       family: 'DancingScript',     google: 'Dancing+Script',     weight: 700 },
];

const FONT_MAP = new Map(FONTS.map((f) => [f.id, f]));
const available = new Set();

function registerFonts() {
  // Register the original Gotcha font if present
  const gotchaPath = path.join(FONT_DIR, 'Gotcha.ttf');
  if (fs.existsSync(gotchaPath)) {
    GlobalFonts.registerFromPath(gotchaPath, 'Gotcha');
  }

  for (const font of FONTS) {
    const fp = path.join(FONT_DIR, font.file);
    if (fs.existsSync(fp)) {
      GlobalFonts.registerFromPath(fp, font.family);
      available.add(font.id);
    }
  }

  const count = available.size;
  console.log(`Registered ${count}/${FONTS.length} custom fonts.${count < FONTS.length ? ' Run "npm run download-fonts" to fetch missing fonts.' : ''}`);
}

function getFont(id) {
  return FONT_MAP.get(id) || FONTS[0];
}

function getDefaultFont() {
  return FONTS[0]; // Inconsolata
}

function getFontFamily(id) {
  const font = FONT_MAP.get(id);
  if (font && available.has(font.id)) return font.family;
  // Fall back through: Inconsolata -> Gotcha -> sans-serif
  if (available.has('inconsolata')) return 'Inconsolata';
  if (fs.existsSync(path.join(FONT_DIR, 'Gotcha.ttf'))) return 'Gotcha';
  return 'sans-serif';
}

function isFontAvailable(id) {
  return available.has(id);
}

module.exports = { FONTS, registerFonts, getFont, getDefaultFont, getFontFamily, isFontAvailable };
