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

  // /setpinchannel channel:#pins   (restricted to members who can manage the server)
  new SlashCommandBuilder()
    .setName('setpinchannel')
    .setDescription('Set the channel where pinned quotes are copied')
    .addChannelOption((opt) =>
      opt.setName('channel')
        .setDescription('Channel to send pinned quotes to')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    const route = process.env.GUILD_ID
      ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
      : Routes.applicationCommands(process.env.CLIENT_ID);
    await rest.put(route, { body: commands });
    console.log(process.env.GUILD_ID
      ? 'Registered guild commands (appear instantly).'
      : 'Registered global commands (can take up to 1 hour).');
  } catch (err) {
    console.error(err);
  }
})();
