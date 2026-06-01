// src/index.js
require('dotenv').config();
const {
  Client, GatewayIntentBits, Partials, Events,
  AttachmentBuilder, MessageFlags,
} = require('discord.js');
const { makeGotcha } = require('./gotcha');
const { getPinChannel, setPinChannel } = require('./config');

const COMMAND_NAME = 'Gotcha';
const PIN_EMOJI = '\u{1F4CC}'; // 📌
const DONE_EMOJI = '\u2705';   // ✅ marker so we don't double-pin

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  // Partials let reaction events fire on messages not in cache (e.g. after a restart)
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.once(Events.ClientReady, (c) => console.log(`gotcha-bot online as ${c.user.tag}`));

client.on(Events.InteractionCreate, async (interaction) => {
  // ---- Slash command: choose where pinned quotes are copied ----
  if (interaction.isChatInputCommand() && interaction.commandName === 'setpinchannel') {
    if (!interaction.guildId) {
      return interaction.reply({ content: 'Use this inside a server.', flags: MessageFlags.Ephemeral });
    }
    const channel = interaction.options.getChannel('channel');
    setPinChannel(interaction.guildId, channel.id);
    return interaction.reply({
      content: `\u{1F4CC} Pinned quotes will now be sent to ${channel}.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  // ---- Feature 1: "Gotcha" context-menu command ----
  if (interaction.isMessageContextMenuCommand() && interaction.commandName === COMMAND_NAME) {
    const target = interaction.targetMessage;
    const content = (target.content || '').trim();
    if (!content) {
      return interaction.reply({
        content: 'That message has no text to quote.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply();
    const displayName = target.member?.displayName || target.author.username;
    const avatarUrl = target.author.displayAvatarURL({ extension: 'png', size: 512 });

    try {
      const png = await makeGotcha({ text: content, authorName: displayName, avatarUrl });
      const file = new AttachmentBuilder(png, { name: 'gotcha.png' });
      const sent = await interaction.editReply({ files: [file] });
      await sent.react(PIN_EMOJI); // hint that users can pin it
    } catch (err) {
      console.error('gotcha render failed:', err);
      await interaction.editReply('Something went wrong generating that quote.');
    }
  }
});

// ---- Feature 2: Pin bypass ----
client.on(Events.MessageReactionAdd, async (reaction, user) => {
  try {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch();
    if (reaction.emoji.name !== PIN_EMOJI) return;
    if (reaction.message.partial) await reaction.message.fetch();

    const message = reaction.message;
    if (message.author?.id !== client.user.id) return;   // only our own quotes
    if (message.attachments.size === 0) return;

    const pinChannelId = getPinChannel(message.guildId);
    if (!pinChannelId) {
      return console.warn(`No pin channel set for guild ${message.guildId}. Run /setpinchannel.`);
    }

    // Best-effort dedupe: skip if we already marked this message done
    const done = message.reactions.cache.get(DONE_EMOJI);
    if (done) { await done.users.fetch(); if (done.users.cache.has(client.user.id)) return; }

    const pinChannel = await client.channels.fetch(pinChannelId);
    if (!pinChannel?.isTextBased()) return;

    // Re-upload the image so it persists independently of the original
    const original = message.attachments.first();
    const res = await fetch(original.url);
    const buf = Buffer.from(await res.arrayBuffer());
    const file = new AttachmentBuilder(buf, { name: original.name || 'gotcha.png' });

    await pinChannel.send({
      content: `\u{1F4CC} Pinned by ${user} from ${message.channel}`,
      files: [file],
    });
    await message.react(DONE_EMOJI);
  } catch (err) {
    console.error('Pin bypass failed:', err);
  }
});

client.login(process.env.DISCORD_TOKEN);
