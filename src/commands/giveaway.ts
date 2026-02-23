import { 
    SlashCommandBuilder, 
    ChatInputCommandInteraction, 
    PermissionFlagsBits,
    TextChannel
} from 'discord.js';
import { ObsidianClient } from '../client';
import { GiveawayManager } from '../modules/giveaways/GiveawayManager';

export default {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Giveaway management commands')
        .addSubcommand(sub => 
            sub.setName('start')
               .setDescription('Start a giveaway')
               .addStringOption(opt => opt.setName('prize').setDescription('Prize for the giveaway').setRequired(true))
               .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners').setRequired(true))
               .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g., 1h, 1d)').setRequired(true))
               .addChannelOption(opt => opt.setName('channel').setDescription('Channel for the giveaway').setRequired(false))
        ),
    
    async execute(interaction: ChatInputCommandInteraction, client: ObsidianClient) {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'Only administrators can start giveaways.', ephemeral: true });
        }

        const sub = interaction.options.getSubcommand();

        if (sub === 'start') {
            const prize = interaction.options.getString('prize')!;
            const winners = interaction.options.getInteger('winners')!;
            const duration = interaction.options.getString('duration')!;
            const channel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;

            const giveawayManager = new GiveawayManager(client);
            await giveawayManager.createGiveaway(channel, prize, winners, duration, interaction.user);
            await interaction.reply({ content: 'Giveaway has been started!', ephemeral: true });
        }
    }
};
