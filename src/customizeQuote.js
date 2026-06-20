// src/customizeQuote.js
// Handles the /customizequote ephemeral UI: theme/font select menus,
// live preview rendering, and Apply/Cancel buttons.
const {
  ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle,
  AttachmentBuilder, MessageFlags,
} = require('discord.js');
const { THEMES, getTheme } = require('./themes');
const { FONTS, getFont, isFontAvailable } = require('./fonts');
const { getUserPrefs, setUserPrefs } = require('./userPrefs');
const { makeGotcha } = require('./gotcha');

const PREVIEW_TEXT = 'This is a preview of your quote style!';

// In-flight sessions: userId -> { theme, font }
const sessions = new Map();

// ---- Build the component rows ----

function themeSelectRow(currentId) {
  // Discord allows max 25 options per select menu; we have 22
  const menu = new StringSelectMenuBuilder()
    .setCustomId('cq:theme')
    .setPlaceholder('Choose a theme…')
    .addOptions(THEMES.map((t) => ({
      label: t.name,
      value: t.id,
      default: t.id === currentId,
    })));
  return new ActionRowBuilder().addComponents(menu);
}

function fontSelectRow(currentId) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('cq:font')
    .setPlaceholder('Choose a font…')
    .addOptions(FONTS.map((f) => ({
      label: f.name,
      value: f.id,
      description: isFontAvailable(f.id) ? undefined : '(not installed)',
      default: f.id === currentId,
    })));
  return new ActionRowBuilder().addComponents(menu);
}

function buttonRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cq:apply').setLabel('Apply').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('cq:cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
  );
}

// ---- Render a preview image using the session's current selections ----

async function renderPreview(interaction, session) {
  const theme = getTheme(session.theme);
  const user = interaction.user;
  const member = interaction.member;
  const displayName = member?.displayName || user.displayName || user.username;
  const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 512 });

  return makeGotcha({
    text: PREVIEW_TEXT,
    authorName: displayName,
    username: user.username,
    avatarUrl,
    theme,
    fontId: session.font,
  });
}

function buildPayload(png, session) {
  const themeName = getTheme(session.theme).name;
  const fontName = getFont(session.font).name;
  return {
    content: `**Quote Customization**\nTheme: **${themeName}** · Font: **${fontName}**`,
    files: [new AttachmentBuilder(png, { name: 'preview.png' })],
    components: [
      themeSelectRow(session.theme),
      fontSelectRow(session.font),
      buttonRow(),
    ],
    flags: MessageFlags.Ephemeral,
  };
}

// ---- Interaction handlers ----

async function handleCommand(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const prefs = getUserPrefs(interaction.user.id);
  const session = { theme: prefs.theme, font: prefs.font };
  sessions.set(interaction.user.id, session);

  const png = await renderPreview(interaction, session);
  await interaction.editReply(buildPayload(png, session));
}

async function handleThemeSelect(interaction) {
  const session = sessions.get(interaction.user.id);
  if (!session) return interaction.reply({ content: 'Session expired — run /customizequote again.', flags: MessageFlags.Ephemeral });

  session.theme = interaction.values[0];
  await interaction.deferUpdate();
  const png = await renderPreview(interaction, session);
  await interaction.editReply(buildPayload(png, session));
}

async function handleFontSelect(interaction) {
  const session = sessions.get(interaction.user.id);
  if (!session) return interaction.reply({ content: 'Session expired — run /customizequote again.', flags: MessageFlags.Ephemeral });

  session.font = interaction.values[0];
  await interaction.deferUpdate();
  const png = await renderPreview(interaction, session);
  await interaction.editReply(buildPayload(png, session));
}

async function handleApply(interaction) {
  const session = sessions.get(interaction.user.id);
  if (!session) return interaction.reply({ content: 'Session expired — run /customizequote again.', flags: MessageFlags.Ephemeral });

  setUserPrefs(interaction.user.id, { theme: session.theme, font: session.font });
  sessions.delete(interaction.user.id);

  const themeName = getTheme(session.theme).name;
  const fontName = getFont(session.font).name;
  await interaction.update({
    content: `Saved! Your quotes will now use **${themeName}** theme with **${fontName}** font.`,
    files: [],
    components: [],
  });
}

async function handleCancel(interaction) {
  sessions.delete(interaction.user.id);
  await interaction.update({
    content: 'Customization cancelled — no changes saved.',
    files: [],
    components: [],
  });
}

// Dispatcher — returns true if this interaction was handled
async function handleInteraction(interaction) {
  if (interaction.isChatInputCommand() && interaction.commandName === 'customizequote') {
    await handleCommand(interaction);
    return true;
  }

  if (!interaction.customId?.startsWith('cq:')) return false;

  const action = interaction.customId.slice(3); // strip 'cq:'
  if (interaction.isStringSelectMenu()) {
    if (action === 'theme') { await handleThemeSelect(interaction); return true; }
    if (action === 'font')  { await handleFontSelect(interaction);  return true; }
  }
  if (interaction.isButton()) {
    if (action === 'apply')  { await handleApply(interaction);  return true; }
    if (action === 'cancel') { await handleCancel(interaction); return true; }
  }
  return false;
}

module.exports = { handleInteraction };
