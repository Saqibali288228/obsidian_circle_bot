import { 
    ButtonInteraction, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    TextChannel,
    User
} from 'discord.js';
import { ObsidianClient } from '../../client';
import { Logger } from '../../utils/logger';
import { config } from '../../config/config';

export class GiveawayManager {
    private client: ObsidianClient;

    constructor(client: ObsidianClient) {
        this.client = client;
    }

    public async createGiveaway(channel: TextChannel, prize: string, winnersCount: number, duration: string, host: User) {
        const ms = require('ms');
        const durationMs = ms(duration);
        const endTime = new Date(Date.now() + durationMs);

        const { CustomizationManager } = require('../CustomizationManager');
        const customization = new CustomizationManager();
        const configData = await customization.get('giveaways');
        const buttonConfig = await customization.getComponentConfigs('giveaway_button');

        const embed = customization.createEmbed(configData || {
            title: '🎁 Giveaway Started!',
            description: `**Prize:** ${prize}\n**Winners:** ${winnersCount}\n**Host:** ${host}\n**Ends:** <t:${Math.floor(endTime.getTime() / 1000)}:R>`,
            color: 0x000000
        }).setTimestamp();

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('giveaway_join')
                    .setLabel(buttonConfig[0]?.label || 'Join Giveaway')
                    .setEmoji(buttonConfig[0]?.emoji || '🎉')
                    .setStyle(ButtonStyle[buttonConfig[0]?.style as keyof typeof ButtonStyle] || ButtonStyle.Primary)
            );

        const message = await channel.send({ embeds: [embed], components: [row] });

        await this.client.db.run(
            'INSERT INTO giveaways (message_id, channel_id, prize, winners_count, end_time, host_id) VALUES (?, ?, ?, ?, ?, ?)',
            message.id, channel.id, prize, winnersCount, endTime.toISOString(), host.id
        );

        // Create participation table for this giveaway
        await this.client.db.run(`
            CREATE TABLE IF NOT EXISTS giveaway_participants (
                message_id TEXT,
                user_id TEXT,
                PRIMARY KEY (message_id, user_id)
            )
        `);

        // Schedule ending
        setTimeout(() => this.endGiveaway(message.id), durationMs);
    }

    public async joinGiveaway(interaction: ButtonInteraction) {
        const giveaway = await this.client.db.get('SELECT * FROM giveaways WHERE message_id = ? AND status = ?', interaction.message.id, 'active');
        if (!giveaway) {
            return interaction.reply({ content: 'This giveaway has already ended.', ephemeral: true });
        }

        const { CustomizationManager } = require('../CustomizationManager');
        const customization = new CustomizationManager();
        const config = await customization.get('giveaways');

        try {
            await this.client.db.run(
                'INSERT INTO giveaway_participants (message_id, user_id) VALUES (?, ?)',
                interaction.message.id, interaction.user.id
            );
            const msg = config?.success_msg || 'You have joined the giveaway! Good luck!';
            await interaction.reply({ content: msg, ephemeral: true });
        } catch (error) {
            const errorMsg = config?.error_msg || 'You are already in this giveaway!';
            await interaction.reply({ content: errorMsg, ephemeral: true });
        }
    }

    public async endGiveaway(messageId: string) {
        const giveaway = await this.client.db.get('SELECT * FROM giveaways WHERE message_id = ? AND status = ?', messageId, 'active');
        if (!giveaway) return;

        const participants = await this.client.db.all('SELECT user_id FROM giveaway_participants WHERE message_id = ?', messageId);
        
        const winners: string[] = [];
        if (participants.length > 0) {
            const shuffled = participants.sort(() => 0.5 - Math.random());
            winners.push(...shuffled.slice(0, giveaway.winners_count).map(p => `<@${p.user_id}>`));
        }

        await this.client.db.run('UPDATE giveaways SET status = ? WHERE message_id = ?', 'ended', messageId);

        const channel = await this.client.channels.fetch(giveaway.channel_id) as TextChannel;
        const message = await channel.messages.fetch(messageId);

        const { CustomizationManager } = require('../CustomizationManager');
        const customization = new CustomizationManager();
        const configData = await customization.get('giveaway_end');

        const embed = customization.createEmbed(configData || {
            title: '🎁 Giveaway Ended!',
            description: `**Prize:** ${giveaway.prize}\n**Winners:** ${winners.length > 0 ? winners.join(', ') : 'No winners (no participants)'}`,
            color: 0xff0000
        }).setTimestamp();

        await message.edit({ embeds: [embed], components: [] });
        
        if (winners.length > 0) {
            const announcement = configData?.success_msg?.replace('{winners}', winners.join(', ')).replace('{prize}', giveaway.prize) || `Congratulations ${winners.join(', ')}! You won **${giveaway.prize}**!`;
            await channel.send(announcement);
        } else {
            const noWinners = configData?.error_msg?.replace('{prize}', giveaway.prize) || `The giveaway for **${giveaway.prize}** has ended, but no one joined.`;
            await channel.send(noWinners);
        }
    }
}
