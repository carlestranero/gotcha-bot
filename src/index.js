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

// Tracks who created each quote (quoteMessageId -> creatorUserId), so only that
// person can pin it. In-memory: entries are lost on restart (see notes).
const quoteCreators = new Map();

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

// Build the quote image + a subtext jump-link to the original message.
// Returns a message payload, or null if the source has no text to quote.
async function buildQuote(sourceMessage) {
  // cleanContent resolves mention tokens (<@id>, <#id>, <@&id>) to readable @name / #channel text.
  // Custom emoji tokens (<:name:id>) are kept so gotcha.js can draw them as inline images.
  const text = (sourceMessage.cleanContent || '').trim();
  if (!text) return null;
  const author = sourceMessage.author;
  const displayName = sourceMessage.member?.displayName || author.displayName || author.username;
  const username = author.username; // the @handle, e.g. "toxicimpulse"
  const avatarUrl = author.displayAvatarURL({ extension: 'png', size: 512 });
  const png = await makeGotcha({ text, authorName: displayName, username, avatarUrl });
  return {
    files: [new AttachmentBuilder(png, { name: 'gotcha.png' })],
    content: `-# \u{1F517} ${sourceMessage.url}`, // small clickable link to the original
  };
}

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

  // ---- "Gotcha" context-menu command (right-click → Apps → Gotcha) ----
  if (interaction.isMessageContextMenuCommand() && interaction.commandName === COMMAND_NAME) {
    await interaction.deferReply();
    try {
      const payload = await buildQuote(interaction.targetMessage);
      if (!payload) return interaction.editReply('That message has no text to quote.');
      const sent = await interaction.editReply(payload);
      quoteCreators.set(sent.id, interaction.user.id); // only this user may pin it
      await sent.react(PIN_EMOJI); // hint that they can pin it
    } catch (err) {
      console.error('gotcha render failed:', err);
      await interaction.editReply('Something went wrong generating that quote.');
    }
  }
});

// ---- Reply + mention: reply to a message, @mention the bot, get a quote ----
client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot) return;
    // Must explicitly @mention the bot (not merely reply to it)
    if (!message.mentions.has(client.user, { ignoreRepliedUser: true })) return;

    if (!message.reference?.messageId) {
      await message.reply("Reply to a message and mention me, and I'll quote it.");
      return;
    }

    const referenced = await message.fetchReference();
    if (referenced.author.bot) return; // don't quote other bots or myself

    const payload = await buildQuote(referenced);
    if (!payload) {
      await message.reply('That message has no text to quote.');
      return;
    }

    const sent = await message.channel.send(payload);
    quoteCreators.set(sent.id, message.author.id); // only this user may pin it
    await sent.react(PIN_EMOJI);
  } catch (err) {
    console.error('reply-mention quote failed:', err);
  }
});

// ---- Pin bypass: react 📌 on a quote to copy it to the pins channel ----
client.on(Events.MessageReactionAdd, async (reaction, user) => {
  try {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch();
    if (reaction.emoji.name !== PIN_EMOJI) return;
    if (reaction.message.partial) await reaction.message.fetch();

    const message = reaction.message;
    if (message.author?.id !== client.user.id) return;   // only our own quotes
    if (message.attachments.size === 0) return;

    // Only the person who created this quote may pin it.
    const creatorId = quoteCreators.get(message.id);
    if (creatorId && user.id !== creatorId) {
      // Someone else tried to pin — remove their stray 📌 and stop.
      await reaction.users.remove(user.id).catch(() => {});
      return;
    }

    // Already pinned? (a ✅ is left behind once done)
    if (message.reactions.cache.has(DONE_EMOJI)) return;

    const pinChannelId = getPinChannel(message.guildId);
    if (!pinChannelId) {
      return console.warn(`No pin channel set for guild ${message.guildId}. Run /setpinchannel.`);
    }

    const pinChannel = await client.channels.fetch(pinChannelId);
    if (!pinChannel?.isTextBased()) return;

    // Re-upload the image so it persists independently of the original
    const original = message.attachments.first();
    const res = await fetch(original.url);
    const buf = Buffer.from(await res.arrayBuffer());
    const file = new AttachmentBuilder(buf, { name: original.name || 'gotcha.png' });

    // message.content already holds the subtext link to the original — carry it over
    await pinChannel.send({
      content: `\u{1F4CC} Pinned by ${user} from ${message.channel}\n${message.content || ''}`.trim(),
      files: [file],
    });

    // Clear every 📌 reaction (needs Manage Messages), then mark done with ✅
    await message.reactions.cache.get(PIN_EMOJI)?.remove().catch(() => {});
    await message.react(DONE_EMOJI);
    quoteCreators.delete(message.id); // no longer needed once pinned
  } catch (err) {
    console.error('Pin bypass failed:', err);
  }
});

client.login(process.env.DISCORD_TOKEN);
