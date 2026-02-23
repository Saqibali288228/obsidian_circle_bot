import { 
    SlashCommandBuilder, 
    ChatInputCommandInteraction, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    PermissionFlagsBits,
    TextChannel,
    Role
} from 'discord.js';
import { ObsidianClient } from '../client';
import { config } from '../config/config';

export default {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Role management commands')
        .addSubcommand(sub => 
            sub.setName('setup')
               .setDescription('Setup a role panel')
               .addChannelOption(opt => opt.setName('channel').setDescription('Channel for the panel').setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName('add-button')
               .setDescription('Add a role button to the panel configuration')
               .addStringOption(opt => opt.setName('id').setDescription('Unique ID for this button').setRequired(true))
               .addRoleOption(opt => opt.setName('role').setDescription('Role to assign').setRequired(true))
               .addStringOption(opt => opt.setName('label').setDescription('Button label'))
               .addStringOption(opt => opt.setName('emoji').setDescription('Button emoji'))
               .addStringOption(opt => opt.setName('style').setDescription('Button style (PRIMARY, SECONDARY, SUCCESS, DANGER)').addChoices(
                   { name: 'Primary', value: 'Primary' },
                   { name: 'Secondary', value: 'Secondary' },
                   { name: 'Success', value: 'Success' },
                   { name: 'Danger', value: 'Danger' }
               ))
        ),
    
    async execute(interaction: ChatInputCommandInteraction, client: ObsidianClient) {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'Only administrators can setup role panels.', ephemeral: true });
        }

        const sub = interaction.options.getSubcommand();

        const { CustomizationManager } = require('../modules/CustomizationManager');
        const customization = new CustomizationManager();

        if (sub === 'setup') {
            const channel = interaction.options.getChannel('channel') as TextChannel;
            const configData = await customization.get('roles');
            const buttonConfigs = await customization.getComponentConfigs('roles');

            const embed = customization.createEmbed(configData || {
                title: 'Self-Claimable Roles',
                description: 'Click a button below to get a role.',
                color: 0x000000
            }).setTimestamp();

            const rows: ActionRowBuilder<ButtonBuilder>[] = [];
            let currentRow = new ActionRowBuilder<ButtonBuilder>();

            if (buttonConfigs.length > 0) {
                buttonConfigs.forEach((btn: any, index: number) => {
                    if (index > 0 && index % 5 === 0) {
                        rows.push(currentRow);
                        currentRow = new ActionRowBuilder<ButtonBuilder>();
                    }
                    const button = new ButtonBuilder()
                        .setCustomId(`role_toggle:${btn.target_value}`)
                        .setLabel(btn.label || 'Role')
                        .setStyle(ButtonStyle[btn.style as keyof typeof ButtonStyle] || ButtonStyle.Secondary);
                    
                    if (btn.emoji) button.setEmoji(btn.emoji);
                    currentRow.addComponents(button);
                });
                rows.push(currentRow);
            }

            await channel.send({ embeds: [embed], components: rows });
            await interaction.reply({ content: 'Role panel has been setup!', ephemeral: true });

        } else if (sub === 'add-button') {
            const id = interaction.options.getString('id')!;
            const role = interaction.options.getRole('role') as Role;
            const label = interaction.options.getString('label') || role.name;
            const emoji = interaction.options.getString('emoji') || undefined;
            const style = interaction.options.getString('style') || 'Secondary';

            await customization.setComponentConfig(id, 'roles', { label, emoji, style, target_value: role.id });
            await interaction.reply({ content: `Successfully added/updated role button **${id}** for role **${role.name}**.`, ephemeral: true });
        }
    }
};
