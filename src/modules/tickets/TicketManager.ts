import { 
    ButtonInteraction, 
    ChannelType, 
    Guild, 
    PermissionFlagsBits, 
    TextChannel, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    User
} from 'discord.js';
import { ObsidianClient } from '../../client';
import { Logger } from '../../utils/logger';
import { config } from '../../config/config';

export class TicketManager {
    private client: ObsidianClient;

    constructor(client: ObsidianClient) {
        this.client = client;
    }

    public async createTicket(interaction: ButtonInteraction, reason: string) {
        const guild = interaction.guild;
        if (!guild) return;

        // Check if user already has an open ticket for this reason
        const existingTicket = await this.client.db.get(
            'SELECT * FROM tickets WHERE user_id = ? AND reason = ? AND status = ?',
            interaction.user.id, reason, 'open'
        );

        if (existingTicket) {
            return interaction.reply({ 
                content: `You already have an open ticket for: **${reason}**`, 
                ephemeral: true 
            });
        }

        await interaction.deferReply({ ephemeral: true });

        // Get and increment global ticket number
        const counterRow = await this.client.db.get('SELECT value FROM counters WHERE key = ?', 'ticket_number');
        const ticketNumber = (counterRow?.value || 0) + 1;
        await this.client.db.run('UPDATE counters SET value = ? WHERE key = ?', ticketNumber, 'ticket_number');

        const channelName = `${reason}-${interaction.user.username}-${ticketNumber}`.toLowerCase().replace(/[^a-z0-9-]/g, '');

        try {
            // Find or create tickets category (optional, but good for organization)
            let category = guild.channels.cache.find(c => c.name === 'Tickets' && c.type === ChannelType.GuildCategory);
            
            const channel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: category?.id,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                    },
                    // Add moderator role permissions if configured
                ],
            }) as TextChannel;

            // Save to DB
            await this.client.db.run(
                'INSERT INTO tickets (channel_id, user_id, reason, status) VALUES (?, ?, ?, ?)',
                channel.id, interaction.user.id, reason, 'open'
            );

            const { CustomizationManager } = require('../CustomizationManager');
            const customization = new CustomizationManager();
            const config = await customization.get('ticket_created');
            
            const embed = customization.createEmbed(config || {
                title: `Ticket #${ticketNumber} - ${reason}`,
                description: `Welcome ${interaction.user}! Support will be with you shortly.\n\nReason: **${reason}**`,
                color: 0x000000
            }).setTimestamp();

            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_close')
                        .setLabel('Close Ticket')
                        .setEmoji('🔒')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('ticket_claim')
                        .setLabel('Claim Ticket')
                        .setEmoji('🙋‍♂️')
                        .setStyle(ButtonStyle.Primary)
                );

            await channel.send({ embeds: [embed], components: [row] });
            await interaction.editReply({ content: `Ticket created: ${channel}` });

        } catch (error) {
            Logger.error('Failed to create ticket', error);
            await interaction.editReply({ content: 'Failed to create ticket. Please contact an administrator.' });
        }
    }

    public async closeTicket(interaction: ButtonInteraction | any, channelId: string) {
        const ticket = await this.client.db.get('SELECT * FROM tickets WHERE channel_id = ? AND status = ?', channelId, 'open');
        if (!ticket) return;

        await this.client.db.run('UPDATE tickets SET status = ? WHERE channel_id = ?', 'closed', channelId);
        
        const { CustomizationManager } = require('../CustomizationManager');
        const customization = new CustomizationManager();
        const config = await customization.get('ticket_close');
        
        const channel = interaction.guild?.channels.cache.get(channelId) as TextChannel;
        if (channel) {
            await channel.send(config?.success_msg || 'This ticket has been closed and will be deleted in 10 seconds.');
            setTimeout(() => channel.delete().catch(() => {}), 10000);
        }
    }

    public async claimTicket(interaction: ButtonInteraction) {
        const ticket = await this.client.db.get('SELECT * FROM tickets WHERE channel_id = ? AND status = ?', interaction.channelId, 'open');
        if (!ticket) return;

        if (ticket.claimed_by) {
            return interaction.reply({ content: 'This ticket is already claimed.', ephemeral: true });
        }

        await this.client.db.run('UPDATE tickets SET claimed_by = ? WHERE channel_id = ?', interaction.user.id, interaction.channelId);
        
        const { CustomizationManager } = require('../CustomizationManager');
        const customization = new CustomizationManager();
        const config = await customization.get('ticket_claim');

        await interaction.reply({ 
            content: config?.success_msg?.replace('{user}', interaction.user.toString()) || `Ticket claimed by ${interaction.user}`, 
            ephemeral: false 
        });

        // Update permissions to allow the claiming moderator if they weren't already allowed
        const channel = interaction.channel as TextChannel;
        await channel.permissionOverwrites.edit(interaction.user.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
        });
    }
}
