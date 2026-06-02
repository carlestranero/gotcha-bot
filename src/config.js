// src/config.js
// A tiny per-guild settings store backed by a JSON file on disk,
// so choices (like the pin channel) survive bot restarts.
const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'config.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return {}; // file doesn't exist yet or is empty
  }
}

function save(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// Returns the pin channel for a guild, falling back to the .env default.
function getPinChannel(guildId) {
  const data = load();
  return data[guildId]?.pinChannelId || process.env.PIN_CHANNEL_ID || null;
}

function setPinChannel(guildId, channelId) {
  const data = load();
  data[guildId] = { ...(data[guildId] || {}), pinChannelId: channelId };
  save(data);
}

// Channel where generated quotes are posted (null = post in the channel it was triggered in).
function getQuoteChannel(guildId) {
  const data = load();
  return data[guildId]?.quoteChannelId || null;
}

function setQuoteChannel(guildId, channelId) {
  const data = load();
  data[guildId] = { ...(data[guildId] || {}), quoteChannelId: channelId };
  save(data);
}

module.exports = { getPinChannel, setPinChannel, getQuoteChannel, setQuoteChannel };