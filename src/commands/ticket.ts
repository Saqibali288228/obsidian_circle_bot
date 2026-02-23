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
        .setName('ticket')
        .setDescription('Ticket management commands')
        .addSubcommand(sub => 
            sub.setName('setup')
               .setDescription('Setup the ticket panel')
               .addChannelOption(opt => opt.setName('channel').setDescription('Channel for the panel').setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName('add-button')
               .setDescription('Add a button to the ticket panel configuration')
               .addStringOption(opt => opt.setName('id').setDescription('Unique ID for this button').setRequired(true))
               .addStringOption(opt => opt.setName('label').setDescription('Button label').setRequired(true))
               .addStringOption(opt => opt.setName('reason').setDescription('Ticket reason for this button').setRequired(true))
               .addStringOption(opt => opt.setName('emoji').setDescription('Button emoji'))
               .addStringOption(opt => opt.setName('style').setDescription('Button style (PRIMARY, SECONDARY, SUCCESS, DANGER)').addChoices(
                   { name: 'Primary', value: 'Primary' },
                   { name: 'Secondary', value: 'Secondary' },
                   { name: 'Success', value: 'Success' },
                   { name: 'Danger', value: 'Danger' }
               ))
        )
        .addSubcommand(sub => 
            sub.setName('close')
               .setDescription('Close current ticket')
        )
        .addSubcommand(sub => 
            sub.setName('add')
               .setDescription('Add user to ticket')
               .addUserOption(opt => opt.setName('user').setDescription('User to add').setRequired(true))
        ),
    
    async execute(interaction: ChatInputCommandInteraction, client: ObsidianClient) {
        const sub = interaction.options.getSubcommand();

        const { CustomizationManager } = require('../modules/CustomizationManager');
        const customization = new CustomizationManager();

        if (sub === 'setup') {
            if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: 'Only administrators can setup ticket panels.', ephemeral: true });
            }

            const channel = interaction.options.getChannel('channel') as TextChannel;
            const configData = await customization.get('tickets');
            const buttonConfigs = await customization.getComponentConfigs('tickets');

            const embed = customization.createEmbed(configData || {
                title: 'Support Tickets',
                description: 'Click a button below to open a ticket.',
                color: 0x000000
            }).setTimestamp();

            const rows: ActionRowBuilder<ButtonBuilder>[] = [];
            let currentRow = new ActionRowBuilder<ButtonBuilder>();

            if (buttonConfigs.length === 0) {
                // Default button if none configured
                currentRow.addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_create:support')
                        .setLabel('Open Ticket')
                        .setEmoji('🎫')
                        .setStyle(ButtonStyle.Primary)
                );
            } else {
                buttonConfigs.forEach((btn: any, index: number) => {
                    if (index > 0 && index % 5 === 0) {
                        rows.push(currentRow);
                        currentRow = new ActionRowBuilder<ButtonBuilder>();
                    }
                    const button = new ButtonBuilder()
                        .setCustomId(`ticket_create:${btn.target_value}`)
                        .setLabel(btn.label)
                        .setStyle(ButtonStyle[btn.style as keyof typeof ButtonStyle] || ButtonStyle.Primary);
                    
                    if (btn.emoji) button.setEmoji(btn.emoji);
                    currentRow.addComponents(button);
                });
            }
            rows.push(currentRow);

            await channel.send({ embeds: [embed], components: rows });
            await interaction.reply({ content: 'Ticket panel has been setup!', ephemeral: true });

        } else if (sub === 'add-button') {
            const id = interaction.options.getString('id')!;
            const label = interaction.options.getString('label')!;
            const reason = interaction.options.getString('reason')!;
            const emoji = interaction.options.getString('emoji') || undefined;
            const style = interaction.options.getString('style') || 'Primary';

            await customization.setComponentConfig(id, 'tickets', { label, emoji, style, target_value: reason });
            await interaction.reply({ content: `Successfully added/updated ticket button **${id}**.`, ephemeral: true });

        } else if (sub === 'close') {
            const ticket = await client.db.get('SELECT * FROM tickets WHERE channel_id = ? AND status = ?', interaction.channelId, 'open');
            if (!ticket) {
                return interaction.reply({ content: 'This is not an open ticket channel.', ephemeral: true });
            }

            await client.db.run('UPDATE tickets SET status = ? WHERE channel_id = ?', 'closed', interaction.channelId);
            await interaction.reply('Closing ticket in 10 seconds...');
            setTimeout(() => (interaction.channel as TextChannel).delete().catch(() => {}), 10000);

        } else if (sub === 'add') {
            const ticket = await client.db.get('SELECT * FROM tickets WHERE channel_id = ? AND status = ?', interaction.channelId, 'open');
            if (!ticket) {
                return interaction.reply({ content: 'This is not an open ticket channel.', ephemeral: true });
            }

            const user = interaction.options.getUser('user');
            if (!user) return;

            const channel = interaction.channel as TextChannel;
            await channel.permissionOverwrites.edit(user.id, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });

            await interaction.reply({ content: `Added ${user} to the ticket.` });
        }
    }
};
