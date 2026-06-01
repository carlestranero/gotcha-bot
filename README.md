# gotcha-bot

A Discord bot that turns any message into a quote image. Right-click a message →
**Apps → Gotcha** and the bot replies with a rendered quote (grayscale avatar,
the text, and the author's name). React to that image with 📌 and the bot copies
it into a dedicated "pins" channel — a way around Discord's 50-pin-per-channel limit.

## Requirements

- Node.js **22.12.0+**
- A Discord application/bot with the **Message Content** privileged intent enabled

## Setup

```bash
npm install
cp .env.example .env   # then fill in the values
```

`.env` values:

| Variable         | What it is                                                        |
|------------------|-------------------------------------------------------------------|
| `DISCORD_TOKEN`  | Bot token from the Developer Portal → Bot tab                     |
| `CLIENT_ID`      | Application ID from General Information                            |
| `GUILD_ID`       | Your test server ID (optional; makes the command register instantly) |
| `PIN_CHANNEL_ID` | Channel ID where 📌-reacted quotes get copied                      |

Enable Developer Mode in Discord (Settings → Advanced) to copy IDs by right-clicking.

## Register the command

```bash
npm run deploy
```

With `GUILD_ID` set, the **Gotcha** right-click command appears instantly in that
server. Remove `GUILD_ID` to register it globally (can take up to an hour).

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

Update later with: `git pull && npm install && pm2 restart gotcha-bot`

## Optional

Drop a `.ttf` at `assets/fonts/Gotcha.ttf` to use a custom typeface; otherwise the
system sans-serif is used. On a bare Ubuntu server, install fonts first so text
renders: `sudo apt install -y fontconfig fonts-dejavu`.

## Invite URL

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=101440&scope=bot%20applications.commands
```

Permissions 101440 = View Channels, Send Messages, Attach Files, Read Message History, Add Reactions.
