// src/index.js
require('dotenv').config();
const {
  Client, GatewayIntentBits, Partials, Events,
  AttachmentBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');
const { makeGotcha } = require('./gotcha');
const { getPinChannel, setPinChannel } = require('./config');

const COMMAND_NAME = 'Gotcha';
const PIN_EMOJI = '\u{1F4CC}'; // 📌
const TICK_EMOJI = '\u2705';   // ✅ (used as the Unpin button's icon)

// quoteMessageId -> creatorUserId. Only the creator may pin a quote.
const quoteCreators = new Map();
// quoteMessageId -> { pinnedMessageId, pinnedChannelId, pinnedBy }. Lets the original
// pinner (and only them) unpin, which deletes the pins-channel copy.
const pinnedQuotes = new Map();

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

// The ✅ "Unpin" button that replaces the 📌 reaction once a quote is pinned.
function unpinButtonRow(quoteId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`unpin:${quoteId}`)
      .setLabel('Unpin')
      .setEmoji(TICK_EMOJI)
      .setStyle(ButtonStyle.Secondary),
  );
}

// Resolve @user / @role / #channel mention tokens to readable text, while leaving
// custom emoji tokens (<:name:id>) intact so gotcha.js can draw them as images.
// NOTE: we can't use Message#cleanContent here — it also rewrites <:name:id> into
// :name:, stripping the ID the renderer needs to fetch the emoji image.
function resolveMentions(msg) {
  return (msg.content || '')
    .replace(/<@!?(\d{17,19})>/g, (_, id) =>
      `@${msg.mentions.members?.get(id)?.displayName || msg.mentions.users.get(id)?.username || 'user'}`)
    .replace(/<@&(\d{17,19})>/g, (_, id) => `@${msg.mentions.roles.get(id)?.name || 'role'}`)
    .replace(/<#(\d{17,19})>/g, (_, id) => `#${msg.mentions.channels.get(id)?.name || 'channel'}`);
}

// Build the quote image + a subtext jump-link to the original message.
async function buildQuote(sourceMessage) {
  const text = resolveMentions(sourceMessage).trim();
  if (!text) return null;
  const author = sourceMessage.author;
  const displayName = sourceMessage.member?.displayName || author.displayName || author.username;
  const username = author.username;
  const avatarUrl = author.displayAvatarURL({ extension: 'png', size: 512 });
  const png = await makeGotcha({ text, authorName: displayName, username, avatarUrl });
  return {
    files: [new AttachmentBuilder(png, { name: 'gotcha.png' })],
    content: `-# \u{1F517} ${sourceMessage.url}`,
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

  // ---- Buttons: the unpin / confirm flow ----
  if (interaction.isButton()) {
    const [action, quoteId] = interaction.customId.split(':');

    // Clicked the ✅ Unpin button on a quote -> ask for private confirmation
    if (action === 'unpin') {
      const rec = pinnedQuotes.get(quoteId);
      if (!rec) {
        return interaction.reply({
          content: 'I have no pin record for this (the bot may have restarted since it was pinned).',
          flags: MessageFlags.Ephemeral,
        });
      }
      if (interaction.user.id !== rec.pinnedBy) {
        return interaction.reply({
          content: 'Only the person who pinned this can unpin it.',
          flags: MessageFlags.Ephemeral,
        });
      }
      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`unpinyes:${quoteId}`).setLabel('Yes, unpin').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('unpinno').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
      );
      return interaction.reply({
        content: 'Unpin this quote? This deletes its copy in the pins channel.',
        components: [confirmRow],
        flags: MessageFlags.Ephemeral,
      });
    }

    // Confirmed unpin
    if (action === 'unpinyes') {
      const rec = pinnedQuotes.get(quoteId);
      if (!rec) return interaction.update({ content: 'Pin record is gone (bot may have restarted).', components: [] });
      if (interaction.user.id !== rec.pinnedBy) {
        return interaction.reply({ content: 'Only the person who pinned this can unpin it.', flags: MessageFlags.Ephemeral });
      }
      // Delete the copy in the pins channel
      try {
        const ch = await client.channels.fetch(rec.pinnedChannelId);
        const copy = await ch.messages.fetch(rec.pinnedMessageId);
        await copy.delete();
      } catch (e) { console.warn('unpin: could not delete pinned copy:', e.message); }
      // Revert the quote message: drop the button, re-add the 📌 reaction
      try {
        const quoteMsg = await interaction.channel.messages.fetch(quoteId);
        await quoteMsg.edit({ components: [] });
        await quoteMsg.react(PIN_EMOJI);
      } catch (e) { console.warn('unpin: could not revert quote message:', e.message); }
      pinnedQuotes.delete(quoteId);
      return interaction.update({ content: `${TICK_EMOJI} Unpinned. The 📌 is back so it can be pinned again.`, components: [] });
    }

    // Cancelled
    if (action === 'unpinno') {
      return interaction.update({ content: 'Cancelled — still pinned.', components: [] });
    }
  }

  // ---- "Gotcha" context-menu command (right-click → Apps → Gotcha) ----
  if (interaction.isMessageContextMenuCommand() && interaction.commandName === COMMAND_NAME) {
    await interaction.deferReply();
    try {
      const payload = await buildQuote(interaction.targetMessage);
      if (!payload) return interaction.editReply('That message has no text to quote.');
      const sent = await interaction.editReply(payload);
      quoteCreators.set(sent.id, interaction.user.id); // only this user may pin it
      await sent.react(PIN_EMOJI);
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
    if (!message.mentions.has(client.user, { ignoreRepliedUser: true })) return;

    if (!message.reference?.messageId) {
      await message.reply("Reply to a message and mention me, and I'll quote it.");
      return;
    }

    const referenced = await message.fetchReference();
    if (referenced.author.bot) return;

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

    // Only the quote's creator may pin it.
    const creatorId = quoteCreators.get(message.id);
    if (creatorId && user.id !== creatorId) {
      await reaction.users.remove(user.id).catch(() => {}); // remove their stray 📌
      return;
    }

    if (pinnedQuotes.has(message.id)) return; // already pinned

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

    const pinnedCopy = await pinChannel.send({
      content: `\u{1F4CC} Pinned by ${user} from ${message.channel}\n${message.content || ''}`.trim(),
      files: [file],
    });

    pinnedQuotes.set(message.id, {
      pinnedMessageId: pinnedCopy.id,
      pinnedChannelId: pinChannel.id,
      pinnedBy: user.id,
    });

    // Clear the 📌 reactions, then swap in the ✅ Unpin button
    await message.reactions.cache.get(PIN_EMOJI)?.remove().catch(() => {});
    await message.edit({ components: [unpinButtonRow(message.id)] })
      .catch((e) => console.warn('pin: could not add unpin button:', e.message));
  } catch (err) {
    console.error('Pin bypass failed:', err);
  }
});

client.login(process.env.DISCORD_TOKEN);