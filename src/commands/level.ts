import { 
    SlashCommandBuilder, 
    ChatInputCommandInteraction, 
    EmbedBuilder
} from 'discord.js';
import { ObsidianClient } from '../client';
import { XPManager } from '../modules/xp/XPManager';
import { config } from '../config/config';

export default {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('XP and Leveling commands')
        .addSubcommand(sub => 
            sub.setName('rank')
               .setDescription('Check your current rank')
               .addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(false))
        )
        .addSubcommand(sub => 
            sub.setName('leaderboard')
               .setDescription('View the top 10 users')
        ),
    
    async execute(interaction: ChatInputCommandInteraction, client: ObsidianClient) {
        const sub = interaction.options.getSubcommand();
        const xpManager = new XPManager(client);

        if (sub === 'rank') {
            const user = interaction.options.getUser('user') || interaction.user;
            const userData = await client.db.get('SELECT * FROM xp WHERE user_id = ?', user.id);

            if (!userData) {
                return interaction.reply({ content: `${user.username} has no XP yet.`, ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle(`${user.username}'s Rank`)
                .setThumbnail(user.displayAvatarURL())
                .addFields(
                    { name: 'Level', value: `${userData.level}`, inline: true },
                    { name: 'XP', value: `${userData.xp}`, inline: true }
                )
                .setColor(config.colors.primary)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } else if (sub === 'leaderboard') {
            const leaderboard = await xpManager.getLeaderboard();
            
            const embed = new EmbedBuilder()
                .setTitle('🏆 XP Leaderboard')
                .setColor(config.colors.primary)
                .setTimestamp();

            let description = '';
            for (let i = 0; i < leaderboard.length; i++) {
                const user = await client.users.fetch(leaderboard[i].user_id).catch(() => null);
                description += `**${i + 1}.** ${user ? user.username : 'Unknown User'} - Level ${leaderboard[i].level} (${leaderboard[i].xp} XP)\n`;
            }

            embed.setDescription(description || 'No one on the leaderboard yet.');
            await interaction.reply({ embeds: [embed] });
        }
    }
};
