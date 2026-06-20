#!/usr/bin/env node
// scripts/download-fonts.js
// Downloads all Google Fonts used by the bot into assets/fonts/.
// Usage: node scripts/download-fonts.js
const fs = require('node:fs');
const path = require('node:path');

const FONT_DIR = path.join(__dirname, '..', 'assets', 'fonts');

// User-agent that triggers TTF delivery from Google Fonts CSS API
const TTF_UA = 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)';

const FONTS = [
  { file: 'Inconsolata.ttf',       css: 'Inconsolata:wght@700' },
  { file: 'MPLUSRounded1c.ttf',    css: 'M+PLUS+Rounded+1c:wght@700' },
  { file: 'DelaGothicOne.ttf',     css: 'Dela+Gothic+One' },
  { file: 'DotGothic16.ttf',       css: 'DotGothic16' },
  { file: 'HachiMaruPop.ttf',      css: 'Hachi+Maru+Pop' },
  { file: 'RampartOne.ttf',        css: 'Rampart+One' },
  { file: 'ReggaeOne.ttf',         css: 'Reggae+One' },
  { file: 'RocknRollOne.ttf',      css: 'RocknRoll+One' },
  { file: 'ZenOldMincho.ttf',      css: 'Zen+Old+Mincho:wght@700' },
  { file: 'YujiSyuku.ttf',         css: 'Yuji+Syuku' },
  { file: 'YuseiMagic.ttf',        css: 'Yusei+Magic' },
  { file: 'Exo2.ttf',              css: 'Exo+2:wght@700' },
  { file: 'BrunoAceSC.ttf',        css: 'Bruno+Ace+SC' },
  { file: 'CastoroTitling.ttf',    css: 'Castoro+Titling' },
  { file: 'PoltawskiNowy.ttf',     css: 'Poltawski+Nowy:wght@700' },
  { file: 'VinaSans.ttf',          css: 'Vina+Sans' },
  { file: 'DancingScript.ttf',     css: 'Dancing+Script:wght@700' },
];

async function downloadFont({ file, css }) {
  const dest = path.join(FONT_DIR, file);
  if (fs.existsSync(dest)) {
    console.log(`  [skip] ${file} (already exists)`);
    return true;
  }

  const cssUrl = `https://fonts.googleapis.com/css2?family=${css}&display=swap`;
  try {
    const cssRes = await fetch(cssUrl, { headers: { 'User-Agent': TTF_UA } });
    if (!cssRes.ok) throw new Error(`CSS fetch HTTP ${cssRes.status}`);
    const cssText = await cssRes.text();

    // Extract the first font URL from the CSS
    const urlMatch = cssText.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
    if (!urlMatch) throw new Error('No font URL found in CSS response');

    const fontRes = await fetch(urlMatch[1]);
    if (!fontRes.ok) throw new Error(`Font fetch HTTP ${fontRes.status}`);
    const buf = Buffer.from(await fontRes.arrayBuffer());
    fs.writeFileSync(dest, buf);
    console.log(`  [ok]   ${file} (${(buf.length / 1024).toFixed(0)} KB)`);
    return true;
  } catch (err) {
    console.error(`  [FAIL] ${file}: ${err.message}`);
    return false;
  }
}

(async () => {
  console.log('Downloading fonts to assets/fonts/ ...\n');
  fs.mkdirSync(FONT_DIR, { recursive: true });

  let ok = 0;
  let fail = 0;
  for (const font of FONTS) {
    if (await downloadFont(font)) ok++;
    else fail++;
  }

  console.log(`\nDone. ${ok} succeeded, ${fail} failed.`);

  // Jiyu no Tsubasa is not on Google Fonts — check if user placed it manually
  const jiyuPath = path.join(FONT_DIR, 'JiyuNoTsubasa.ttf');
  if (!fs.existsSync(jiyuPath)) {
    console.log('\nNote: "Jiyu no Tsubasa" is not available on Google Fonts.');
    console.log(`      Place the TTF file manually at: ${jiyuPath}`);
  }
})();
