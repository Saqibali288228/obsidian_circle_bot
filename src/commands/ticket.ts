import { 
    SlashCommandBuilder, 
    ChatInputCommandInteraction, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    TextChannel,
    ChannelType
} from 'discord.js';
import { ObsidianClient } from '../client';
import { TicketManager } from '../modules/tickets/TicketManager';

export default {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Ticket system management')
        .addSubcommand(sub => 
            sub.setName('panel')
               .setDescription('Send a ticket panel embed')
               .addChannelOption(opt => opt.setName('channel').setDescription('Channel to send the panel in').addChannelTypes(ChannelType.GuildText).setRequired(true))
               .addStringOption(opt => opt.setName('title').setDescription('Panel title'))
               .addStringOption(opt => opt.setName('description').setDescription('Panel description'))
               .addStringOption(opt => opt.setName('color').setDescription('Hex color code (e.g. #000000)'))
        )
        .addSubcommand(sub => 
            sub.setName('bind')
               .setDescription('Bind a ticket button to an existing panel')
               .addStringOption(opt => opt.setName('message_id').setDescription('Message ID of the panel').setRequired(true))
               .addStringOption(opt => opt.setName('button_id').setDescription('Custom ID for the button').setRequired(true))
               .addStringOption(opt => opt.setName('label').setDescription('Button label').setRequired(true))
               .addStringOption(opt => opt.setName('type').setDescription('Ticket type (e.g. Support, Billing)').setRequired(true))
               .addChannelOption(opt => opt.setName('category').setDescription('Category to create tickets in').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
               .addRoleOption(opt => opt.setName('staff_role').setDescription('Staff role for this ticket type').setRequired(true))
               .addStringOption(opt => opt.setName('format').setDescription('Channel name format (e.g. ticket-{username}-{count})'))
               .addStringOption(opt => opt.setName('emoji').setDescription('Button emoji'))
               .addStringOption(opt => opt.setName('style').setDescription('Button style (Primary, Secondary, Success, Danger)').addChoices(
                   { name: 'Primary', value: 'Primary' },
                   { name: 'Secondary', value: 'Secondary' },
                   { name: 'Success', value: 'Success' },
                   { name: 'Danger', value: 'Danger' }
               ))
        )
        .addSubcommand(sub => 
            sub.setName('add')
               .setDescription('Add a user to the current ticket')
               .addUserOption(opt => opt.setName('user').setDescription('User to add').setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName('close')
               .setDescription('Close the current ticket')
        ),

    async execute(interaction: ChatInputCommandInteraction, client: ObsidianClient) {
        const sub = interaction.options.getSubcommand();
        const ticketManager = new TicketManager(client);

        if (sub === 'panel') {
            if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: 'You need Administrator permissions to use this command.', ephemeral: true });
            }

            const channel = interaction.options.getChannel('channel') as TextChannel;
            const title = interaction.options.getString('title') || 'Open a Ticket';
            const description = interaction.options.getString('description') || 'Click a button below to open a ticket.';
            const colorStr = interaction.options.getString('color') || '#000000';
            const color = parseInt(colorStr.replace('#', ''), 16);

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor(color);

            const message = await channel.send({ embeds: [embed] });

            await client.db.run(
                'INSERT INTO ticket_panels (message_id, channel_id, guild_id, title, description, color) VALUES (?, ?, ?, ?, ?, ?)',
                message.id, channel.id, interaction.guildId, title, description, color
            );

            await interaction.reply({ content: `Ticket panel sent to ${channel}. Message ID: \`${message.id}\``, ephemeral: true });

        } else if (sub === 'bind') {
            if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: 'You need Administrator permissions to use this command.', ephemeral: true });
            }

            const messageId = interaction.options.getString('message_id')!;
            const buttonId = interaction.options.getString('button_id')!;
            const label = interaction.options.getString('label')!;
            const type = interaction.options.getString('type')!;
            const category = interaction.options.getChannel('category')!;
            const staffRole = interaction.options.getRole('staff_role')!;
            const format = interaction.options.getString('format') || '{type}-{username}-{count}';
            const emoji = interaction.options.getString('emoji') || null;
            const styleStr = interaction.options.getString('style') || 'Primary';

            // Check if panel exists
            const panel = await client.db.get('SELECT * FROM ticket_panels WHERE message_id = ?', messageId);
            if (!panel) {
                return interaction.reply({ content: 'Ticket panel not found. Make sure you used the correct message ID.', ephemeral: true });
            }

            // Save binding
            await client.db.run(
                `INSERT INTO ticket_bindings 
                (message_id, custom_id, label, emoji, style, ticket_type, channel_format, category_id, staff_role_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
                ON CONFLICT(message_id, custom_id) DO UPDATE SET 
                label = excluded.label, emoji = excluded.emoji, style = excluded.style, 
                ticket_type = excluded.ticket_type, channel_format = excluded.channel_format, 
                category_id = excluded.category_id, staff_role_id = excluded.staff_role_id`,
                messageId, buttonId, label, emoji, styleStr, type, format, category.id, staffRole.id
            );

            // Update message buttons
            try {
                const channel = await client.channels.fetch(panel.channel_id) as TextChannel;
                const message = await channel.messages.fetch(messageId);

                const bindings = await client.db.all('SELECT * FROM ticket_bindings WHERE message_id = ?', messageId);
                
                const rows: ActionRowBuilder<ButtonBuilder>[] = [];
                let currentRow = new ActionRowBuilder<ButtonBuilder>();

                bindings.forEach((bind: any, index: number) => {
                    if (index > 0 && index % 5 === 0) {
                        rows.push(currentRow);
                        currentRow = new ActionRowBuilder<ButtonBuilder>();
                    }
                    
                    const button = new ButtonBuilder()
                        .setCustomId(`ticket_btn:${bind.custom_id}`)
                        .setLabel(bind.label)
                        .setStyle(ButtonStyle[bind.style as keyof typeof ButtonStyle] || ButtonStyle.Primary);
                    
                    if (bind.emoji) button.setEmoji(bind.emoji);
                    currentRow.addComponents(button);
                });
                rows.push(currentRow);

                await message.edit({ components: rows });
                await interaction.reply({ content: `Successfully bound button \`${buttonId}\` to the panel.`, ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'Failed to update the panel message. Ensure the bot has access to the channel.', ephemeral: true });
            }

        } else if (sub === 'add') {
            const user = interaction.options.getUser('user')!;
            await ticketManager.addUser(interaction, user);
        } else if (sub === 'close') {
            await ticketManager.closeTicket(interaction);
        }
    }
};
