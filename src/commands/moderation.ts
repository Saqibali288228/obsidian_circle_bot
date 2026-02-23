import { 
    SlashCommandBuilder, 
    ChatInputCommandInteraction, 
    PermissionFlagsBits,
    TextChannel,
    EmbedBuilder
} from 'discord.js';
import { ObsidianClient } from '../client';
import { ModerationManager } from '../modules/moderation/ModerationManager';

export default {
    data: new SlashCommandBuilder()
        .setName('mod')
        .setDescription('Moderation commands')
        .addSubcommand(sub => 
            sub.setName('warn')
               .setDescription('Warn a user')
               .addUserOption(opt => opt.setName('user').setDescription('User to warn').setRequired(true))
               .addStringOption(opt => opt.setName('reason').setDescription('Reason for the warning').setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName('kick')
               .setDescription('Kick a user')
               .addUserOption(opt => opt.setName('user').setDescription('User to kick').setRequired(true))
               .addStringOption(opt => opt.setName('reason').setDescription('Reason for the kick').setRequired(false))
        )
        .addSubcommand(sub => 
            sub.setName('ban')
               .setDescription('Ban a user')
               .addUserOption(opt => opt.setName('user').setDescription('User to ban').setRequired(true))
               .addStringOption(opt => opt.setName('reason').setDescription('Reason for the ban').setRequired(false))
        )
        .addSubcommand(sub => 
            sub.setName('clear')
               .setDescription('Clear messages')
               .addIntegerOption(opt => opt.setName('amount').setDescription('Number of messages to clear').setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName('lock')
               .setDescription('Lock current channel')
        )
        .addSubcommand(sub => 
            sub.setName('unlock')
               .setDescription('Unlock current channel')
        ),
    
    async execute(interaction: ChatInputCommandInteraction, client: ObsidianClient) {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ content: 'Only moderators can use these commands.', ephemeral: true });
        }

        const sub = interaction.options.getSubcommand();
        const modManager = new ModerationManager(client);

        if (sub === 'warn') {
            const user = interaction.options.getUser('user')!;
            const reason = interaction.options.getString('reason')!;
            const embed = await modManager.warn(user, interaction.user, reason);
            await interaction.reply({ embeds: [embed] });

        } else if (sub === 'kick') {
            const user = interaction.options.getUser('user')!;
            const reason = interaction.options.getString('reason') || 'No reason provided.';
            const member = await interaction.guild?.members.fetch(user.id);
            if (!member) return interaction.reply({ content: 'User not found in this server.', ephemeral: true });

            await member.kick(reason);
            await interaction.reply({ content: `${user.username} has been kicked for: ${reason}` });

        } else if (sub === 'ban') {
            const user = interaction.options.getUser('user')!;
            const reason = interaction.options.getString('reason') || 'No reason provided.';
            await interaction.guild?.members.ban(user.id, { reason });
            await interaction.reply({ content: `${user.username} has been banned for: ${reason}` });

        } else if (sub === 'clear') {
            const amount = interaction.options.getInteger('amount')!;
            const cleared = await modManager.clearMessages(interaction.channel as TextChannel, amount);
            await interaction.reply({ content: `Cleared ${cleared} messages.`, ephemeral: true });

        } else if (sub === 'lock') {
            await modManager.lockChannel(interaction.channel as TextChannel);
            await interaction.reply({ content: 'Channel has been locked.' });

        } else if (sub === 'unlock') {
            await modManager.unlockChannel(interaction.channel as TextChannel);
            await interaction.reply({ content: 'Channel has been unlocked.' });
        }
    }
};
