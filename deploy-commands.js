// deploy-commands.js
require('dotenv').config();
const { REST, Routes, ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');

const commands = [
  new ContextMenuCommandBuilder()
    .setName('Gotcha')
    .setType(ApplicationCommandType.Message)
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
      ? 'Registered guild command (appears instantly).'
      : 'Registered global command (can take up to 1 hour).');
  } catch (err) {
    console.error(err);
  }
})();
