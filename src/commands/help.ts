import { 
    SlashCommandBuilder, 
    ChatInputCommandInteraction, 
    EmbedBuilder
} from 'discord.js';
import { ObsidianClient } from '../client';
import { config } from '../config/config';

export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get a list of all commands'),
    
    async execute(interaction: ChatInputCommandInteraction, client: ObsidianClient) {
        const embed = new EmbedBuilder()
            .setTitle('Obsidian Circle Bot - Commands')
            .setDescription('Here is a list of all available commands.')
            .setColor(config.colors.primary)
            .setTimestamp();

        const commands = client.commands;
        commands.forEach(command => {
            embed.addFields({ name: `/${command.data.name}`, value: command.data.description, inline: true });
        });

        await interaction.reply({ embeds: [embed] });
    }
};
