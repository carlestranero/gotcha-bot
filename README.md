# gotcha-bot

A Discord bot that turns any message into a stylized quote image. Right-click a
message, reply-mention the bot, or use the context menu to generate a quote with
a grayscale (or full-color) avatar, custom theme, and custom font. React to a
quote with a pin emoji to copy it into a dedicated pins channel — a workaround for
Discord's 50-pin-per-channel limit.

## Features

- **Quote generation** — right-click a message → Apps → Gotcha, or reply to a
  message and @mention the bot
- **22 themes** — gradient and solid backgrounds (Black/White, Sunset, Chroma Glow,
  Forest, Neon Nights, Cotton Candy, and more)
- **18 fonts** — from clean monospace (Inconsolata) to decorative scripts
  (Dancing Script, Hachi Maru Pop)
- **Avatar style** — choose between classic black & white or full-color avatar
- **Per-user customization** — `/customizequote` opens an ephemeral UI with live
  preview; settings persist across bot restarts
- **Pin bypass** — react with a pin emoji on any quote to copy it to a dedicated
  pins channel; the original pinner can unpin via button
- **Dedicated quote channel** — optionally route all generated quotes to a
  specific channel with `/setquotechannel`

## Requirements

- Node.js **22.12.0+**
- A Discord application/bot with the **Message Content** privileged intent enabled

## Setup

```bash
npm install
cp .env.example .env   # then fill in the values
```

`.env` values:

| Variable         | What it is                                                          |
|------------------|---------------------------------------------------------------------|
| `DISCORD_TOKEN`  | Bot token from the Developer Portal → Bot tab                       |
| `CLIENT_ID`      | Application ID from General Information                              |
| `GUILD_ID`       | Your test server ID (optional; makes commands register instantly)    |
| `PIN_CHANNEL_ID` | Default channel ID where pinned quotes get copied (overridable per server) |

Enable Developer Mode in Discord (Settings → Advanced) to copy IDs by
right-clicking.

## Download fonts

The bot supports 18 custom fonts. Run this once (and again if new fonts are
added in the future):

```bash
npm run download-fonts
```

This downloads Google Fonts TTF files into `assets/fonts/`. The bot will log
which fonts were loaded at startup. Quotes fall back to the system sans-serif
if no fonts are installed.

> **Note:** "Jiyu no Tsubasa" is not available on Google Fonts. Place the TTF
> manually at `assets/fonts/JiyuNoTsubasa.ttf` if you have it.

You can also place a custom `Gotcha.ttf` in `assets/fonts/` — it was the
original default typeface.

## Register commands

```bash
npm run deploy
```

With `GUILD_ID` set, commands appear instantly in that server. Remove `GUILD_ID`
to register globally (can take up to an hour to propagate).

## Run

Locally:

```bash
npm start
```

In production with pm2:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup        # run the sudo command it prints
pm2 logs gotcha-bot
```

## Every time you update the bot

After pulling new code or making changes, run through this checklist:

```bash
# 1. Install any new/updated dependencies
npm install

# 2. Download any newly added fonts
npm run download-fonts

# 3. Re-register slash commands (only needed if commands were added/changed)
npm run deploy

# 4. Restart the bot
pm2 restart gotcha-bot

# Or if running locally, just stop and re-run:
npm start
```

If you only changed bot logic (no new commands, no new dependencies, no new
fonts), you can skip straight to the restart step.

## Commands

| Command | Who | What it does |
|---------|-----|--------------|
| Right-click → Apps → **Gotcha** | Everyone | Generate a quote image from the selected message |
| Reply + @mention the bot | Everyone | Generate a quote from the replied-to message |
| `/customizequote` | Everyone | Open the theme, font, and avatar style picker (ephemeral, with live preview) |
| `/setpinchannel #channel` | Admins | Set where pinned quotes are copied |
| `/setquotechannel #channel` | Admins | Set where generated quotes are posted (omit to post in-place) |

## Project structure

```
src/
  index.js           Main bot entry point and event handlers
  gotcha.js          Image rendering engine (canvas)
  config.js          Per-guild settings (pin channel, quote channel)
  themes.js          22 theme definitions (colors, gradients)
  fonts.js           18 font configs and registration
  userPrefs.js       Per-user customization storage
  customizeQuote.js  /customizequote UI and interaction handler
scripts/
  download-fonts.js  Fetches Google Fonts TTFs to assets/fonts/
deploy-commands.js   Registers slash/context-menu commands with Discord
assets/fonts/        Font files (created by download-fonts script)
data/                Runtime data (config.json, userPrefs.json)
```

## Invite URL

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=101440&scope=bot%20applications.commands
```

Permissions 101440 = View Channels, Send Messages, Attach Files, Read Message
History, Add Reactions.
