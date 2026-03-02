import { 
    ButtonInteraction, 
    ChannelType, 
    PermissionFlagsBits, 
    TextChannel, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    User,
    ChatInputCommandInteraction
} from 'discord.js';
import { ObsidianClient } from '../../client';
import { Logger } from '../../utils/logger';
import { config } from '../../config/config';

export class TicketManager {
    private client: ObsidianClient;

    constructor(client: ObsidianClient) {
        this.client = client;
    }

    /**
     * Creates a new ticket based on a button binding.
     */
    public async createTicket(interaction: ButtonInteraction, binding: any) {
        const guild = interaction.guild;
        if (!guild) return;

        // Check if user already has an open ticket of this type
        const existingTicket = await this.client.db.get(
            'SELECT * FROM tickets WHERE user_id = ? AND ticket_type = ? AND status = ? AND guild_id = ?',
            interaction.user.id, binding.ticket_type, 'open', guild.id
        );

        if (existingTicket) {
            return interaction.reply({ 
                content: `You already have an open ticket for: **${binding.ticket_type}**`, 
                ephemeral: true 
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // Get and increment global ticket number
            const counterRow = await this.client.db.get('SELECT value FROM counters WHERE key = ?', 'ticket_number');
            const ticketNumber = (counterRow?.value || 0) + 1;
            await this.client.db.run('UPDATE counters SET value = ? WHERE key = ?', ticketNumber, 'ticket_number');

            // Format channel name
            let channelName = binding.channel_format
                .replace('{username}', interaction.user.username)
                .replace('{count}', ticketNumber.toString())
                .replace('{type}', binding.ticket_type)
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, '-');

            // Create channel
            const channel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: binding.category_id || null,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                    },
                    {
                        id: binding.staff_role_id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                    },
                    {
                        id: this.client.user!.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels],
                    }
                ],
            }) as TextChannel;

            // Save to DB
            await this.client.db.run(
                'INSERT INTO tickets (channel_id, user_id, ticket_type, status, guild_id) VALUES (?, ?, ?, ?, ?)',
                channel.id, interaction.user.id, binding.ticket_type, 'open', guild.id
            );

            // Send welcome message
            const { CustomizationManager } = require('../CustomizationManager');
            const customization = new CustomizationManager();
            const configData = await customization.get('ticket_welcome');
            
            const embed = customization.createEmbed(configData || {
                title: `Ticket #${ticketNumber}`,
                description: `Welcome {user}! Support will be with you shortly.\nType: **{type}**`,
                color: config.colors.primary
            });

            // Replace placeholders
            let desc = embed.data.description || '';
            desc = desc.replace('{user}', interaction.user.toString())
                       .replace('{type}', binding.ticket_type)
                       .replace('{ticket_id}', ticketNumber.toString());
            embed.setDescription(desc);

            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_close')
                        .setLabel('Close Ticket')
                        .setEmoji('🔒')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('ticket_add_user')
                        .setLabel('Add User')
                        .setEmoji('👤')
                        .setStyle(ButtonStyle.Secondary)
                );

            await channel.send({ embeds: [embed], components: [row] });
            await interaction.editReply({ content: `Ticket created: ${channel}` });

        } catch (error) {
            Logger.error('Failed to create ticket', error);
            await interaction.editReply({ content: 'Failed to create ticket. Please contact an administrator.' });
        }
    }

    /**
     * Closes a ticket.
     */
    public async closeTicket(interaction: ButtonInteraction | ChatInputCommandInteraction) {
        const channelId = interaction.channelId;
        const ticket = await this.client.db.get('SELECT * FROM tickets WHERE channel_id = ? AND status = ?', channelId, 'open');
        
        if (!ticket) {
            return interaction.reply({ content: 'This is not an active ticket channel.', ephemeral: true });
        }

        await this.client.db.run('UPDATE tickets SET status = ? WHERE channel_id = ?', 'closed', channelId);
        
        await interaction.reply({ content: 'Ticket closed. This channel will be deleted in 10 seconds.' });
        
        setTimeout(() => {
            interaction.channel?.delete().catch(() => {});
        }, 10000);
    }

    /**
     * Adds a user to the ticket.
     */
    public async addUser(interaction: ButtonInteraction | ChatInputCommandInteraction, targetUser: User) {
        const channelId = interaction.channelId;
        const ticket = await this.client.db.get('SELECT * FROM tickets WHERE channel_id = ? AND status = ?', channelId, 'open');
        
        if (!ticket) {
            return interaction.reply({ content: 'This is not an active ticket channel.', ephemeral: true });
        }

        const channel = interaction.channel as TextChannel;
        await channel.permissionOverwrites.edit(targetUser.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
        });

        await interaction.reply({ content: `Successfully added ${targetUser} to the ticket.` });
    }
}
