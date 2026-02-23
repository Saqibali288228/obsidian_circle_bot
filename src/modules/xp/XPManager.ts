import { Message, EmbedBuilder, TextChannel } from 'discord.js';
import { ObsidianClient } from '../../client';
import { Logger } from '../../utils/logger';
import { config } from '../../config/config';

export class XPManager {
    private client: ObsidianClient;
    private cooldowns: Map<string, number> = new Map();

    constructor(client: ObsidianClient) {
        this.client = client;
    }

    public async handleMessage(message: Message) {
        if (message.author.bot || !message.guild) return;

        const userId = message.author.id;
        const now = Date.now();
        const lastXP = this.cooldowns.get(userId) || 0;

        if (now - lastXP < 60000) return; // 1 minute cooldown

        this.cooldowns.set(userId, now);

        const xpToGain = Math.floor(Math.random() * 11) + 15; // 15-25 XP

        const userData = await this.client.db.get('SELECT * FROM xp WHERE user_id = ?', userId) || { xp: 0, level: 0 };
        const newXP = userData.xp + xpToGain;
        const newLevel = Math.floor(0.1 * Math.sqrt(newXP));

        await this.client.db.run(
            'INSERT INTO xp (user_id, xp, level, last_message_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET xp = ?, level = ?, last_message_at = ?',
            userId, newXP, newLevel, new Date().toISOString(), newXP, newLevel, new Date().toISOString()
        );

        if (newLevel > userData.level) {
            const embed = new EmbedBuilder()
                .setTitle('Level Up! 🎉')
                .setDescription(`Congratulations ${message.author}! You have reached **Level ${newLevel}**!`)
                .setColor(config.colors.success)
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });
        }
    }

    public async getLeaderboard() {
        return await this.client.db.all('SELECT * FROM xp ORDER BY xp DESC LIMIT 10');
    }
}
