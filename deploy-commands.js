// deploy-commands.js
require('dotenv').config();
const {
  REST, Routes, ContextMenuCommandBuilder, ApplicationCommandType,
  SlashCommandBuilder, ChannelType, PermissionFlagsBits,
} = require('discord.js');

const commands = [
  // Right-click a message → Apps → Gotcha
  new ContextMenuCommandBuilder()
    .setName('Gotcha')
    .setType(ApplicationCommandType.Message)
    .toJSON(),

  // /setpinchannel #channel  — admins only
  new SlashCommandBuilder()
    .setName('setpinchannel')
    .setDescription('Set the channel where pinned quotes are copied')
    .addChannelOption((opt) =>
      opt.setName('channel')
        .setDescription('Channel to send pinned quotes to')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),

  // /setquotechannel #channel  — admins only
  new SlashCommandBuilder()
    .setName('setquotechannel')
    .setDescription('Set the channel where generated quotes are posted')
    .addChannelOption((opt) =>
      opt.setName('channel')
        .setDescription('Channel to post quotes in (leave unset to post in the triggering channel)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),

  // /customizequote — any user
  new SlashCommandBuilder()
    .setName('customizequote')
    .setDescription('Customize your quote appearance (theme & font)')
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    if (process.env.GUILD_ID) {
      // Register to the test guild (instant) and clear any stale global commands
      await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
      console.log('Registered guild commands (appear instantly). Cleared global commands.');
    } else {
      // Register globally and clear any stale guild commands can't be done without GUILD_ID
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
      console.log('Registered global commands (can take up to 1 hour).');
      console.log('Tip: if duplicates appear, set GUILD_ID in .env and re-run to clear stale guild commands.');
    }
  } catch (err) {
    console.error(err);
  }
})();