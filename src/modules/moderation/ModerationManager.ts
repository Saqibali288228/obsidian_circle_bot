import { GuildMember, EmbedBuilder, TextChannel, User, PermissionFlagsBits } from 'discord.js';
import { ObsidianClient } from '../../client';
import { Logger } from '../../utils/logger';
import { config } from '../../config/config';

export class ModerationManager {
    private client: ObsidianClient;

    constructor(client: ObsidianClient) {
        this.client = client;
    }

    public async warn(user: User, moderator: User, reason: string) {
        await this.client.db.run(
            'INSERT INTO warnings (user_id, moderator_id, reason) VALUES (?, ?, ?)',
            user.id, moderator.id, reason
        );

        const warnings = await this.client.db.all('SELECT * FROM warnings WHERE user_id = ?', user.id);
        
        const embed = new EmbedBuilder()
            .setTitle('⚠️ User Warned')
            .setDescription(`${user} has been warned.`)
            .addFields(
                { name: 'Reason', value: reason, inline: true },
                { name: 'Moderator', value: `${moderator}`, inline: true },
                { name: 'Total Warnings', value: `${warnings.length}`, inline: true }
            )
            .setColor(config.colors.warning)
            .setTimestamp();

        return embed;
    }

    public async clearMessages(channel: TextChannel, amount: number) {
        const deleted = await channel.bulkDelete(amount, true);
        return deleted.size;
    }

    public async lockChannel(channel: TextChannel) {
        await channel.permissionOverwrites.edit(channel.guild.id, {
            SendMessages: false
        });
    }

    public async unlockChannel(channel: TextChannel) {
        await channel.permissionOverwrites.edit(channel.guild.id, {
            SendMessages: null
        });
    }
}
