// src/userPrefs.js
// Per-user customization preferences (theme + font), backed by a JSON file.
const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'userPrefs.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return {};
  }
}

function save(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function getUserPrefs(userId) {
  const data = load();
  return data[userId] || { theme: 'black_white', font: 'inconsolata' };
}

function setUserPrefs(userId, { theme, font }) {
  const data = load();
  data[userId] = { theme, font };
  save(data);
}

module.exports = { getUserPrefs, setUserPrefs };
