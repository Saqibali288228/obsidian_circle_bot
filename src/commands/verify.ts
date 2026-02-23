import { 
    SlashCommandBuilder, 
    ChatInputCommandInteraction, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    PermissionFlagsBits,
    TextChannel
} from 'discord.js';
import { ObsidianClient } from '../client';
import { config } from '../config/config';

export default {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verification management commands')
        .addSubcommand(sub => 
            sub.setName('setup')
               .setDescription('Setup the verification panel')
               .addChannelOption(opt => opt.setName('channel').setDescription('Channel for the panel').setRequired(true))
               .addStringOption(opt => opt.setName('title').setDescription('Panel title').setRequired(false))
               .addStringOption(opt => opt.setName('description').setDescription('Panel description').setRequired(false))
        ),
    
    async execute(interaction: ChatInputCommandInteraction, client: ObsidianClient) {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'Only administrators can setup verification panels.', ephemeral: true });
        }

        const sub = interaction.options.getSubcommand();

        if (sub === 'setup') {
            const channel = interaction.options.getChannel('channel') as TextChannel;
            const title = interaction.options.getString('title') || 'Server Verification';
            const description = interaction.options.getString('description') || 'Click the button below to verify yourself and gain access to the server.';

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor(config.colors.primary)
                .setTimestamp();

            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('verify_start')
                        .setLabel('Verify')
                        .setEmoji('🛡️')
                        .setStyle(ButtonStyle.Success)
                );

            await channel.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: 'Verification panel has been setup!', ephemeral: true });
        }
    }
};
