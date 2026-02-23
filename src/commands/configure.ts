import { 
    SlashCommandBuilder, 
    ChatInputCommandInteraction, 
    PermissionFlagsBits,
    EmbedBuilder
} from 'discord.js';
import { ObsidianClient } from '../client';
import { CustomizationManager } from '../modules/CustomizationManager';

export default {
    data: new SlashCommandBuilder()
        .setName('configure')
        .setDescription('Configure bot features and visuals')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommandGroup(group => 
            group.setName('embed')
                 .setDescription('Configure embed visuals')
                 .addSubcommand(sub => 
                    sub.setName('set')
                       .setDescription('Set embed properties')
                       .addStringOption(opt => opt.setName('feature').setDescription('Feature (tickets, roles, verification, giveaways, xp)').setRequired(true))
                       .addStringOption(opt => opt.setName('title').setDescription('Embed title'))
                       .addStringOption(opt => opt.setName('description').setDescription('Embed description'))
                       .addStringOption(opt => opt.setName('color').setDescription('Hex color code (e.g. #000000)'))
                       .addStringOption(opt => opt.setName('footer').setDescription('Embed footer text'))
                       .addStringOption(opt => opt.setName('thumbnail').setDescription('Thumbnail URL'))
                       .addStringOption(opt => opt.setName('image').setDescription('Main image URL'))
                 )
        )
        .addSubcommandGroup(group => 
            group.setName('message')
                 .setDescription('Configure bot messages')
                 .addSubcommand(sub => 
                    sub.setName('set')
                       .setDescription('Set custom messages')
                       .addStringOption(opt => opt.setName('feature').setDescription('Feature (tickets, roles, verification, giveaways, xp)').setRequired(true))
                       .addStringOption(opt => opt.setName('success').setDescription('Success message text'))
                       .addStringOption(opt => opt.setName('error').setDescription('Error message text'))
                 )
        )
        .addSubcommandGroup(group => 
            group.setName('xp')
                 .setDescription('Prepare XP customization (logic added later)')
                 .addSubcommand(sub => 
                    sub.setName('range')
                       .setDescription('Set XP gain range')
                       .addIntegerOption(opt => opt.setName('min').setDescription('Minimum XP').setRequired(true))
                       .addIntegerOption(opt => opt.setName('max').setDescription('Maximum XP').setRequired(true))
                 )
        ),
    
    async execute(interaction: ChatInputCommandInteraction, client: ObsidianClient) {
        const group = interaction.options.getSubcommandGroup();
        const sub = interaction.options.getSubcommand();
        const customization = new CustomizationManager();

        if (group === 'embed' && sub === 'set') {
            const feature = interaction.options.getString('feature')!;
            const title = interaction.options.getString('title') || undefined;
            const description = interaction.options.getString('description') || undefined;
            const colorStr = interaction.options.getString('color');
            const footer = interaction.options.getString('footer') || undefined;
            const thumbnail = interaction.options.getString('thumbnail') || undefined;
            const image = interaction.options.getString('image') || undefined;

            let color: number | undefined;
            if (colorStr) {
                color = parseInt(colorStr.replace('#', ''), 16);
            }

            await customization.set(feature, { title, description, color, footer, thumbnail, image });
            await interaction.reply({ content: `Successfully updated embed configuration for **${feature}**.`, ephemeral: true });

        } else if (group === 'message' && sub === 'set') {
            const feature = interaction.options.getString('feature')!;
            const success = interaction.options.getString('success') || undefined;
            const error = interaction.options.getString('error') || undefined;

            await customization.set(feature, { success_msg: success, error_msg: error });
            await interaction.reply({ content: `Successfully updated message configuration for **${feature}**.`, ephemeral: true });

        } else if (group === 'xp' && sub === 'range') {
            const min = interaction.options.getInteger('min')!;
            const max = interaction.options.getInteger('max')!;
            
            const { DatabaseManager } = require('../database/db');
            const db = await DatabaseManager.getInstance();
            await db.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', 'xp_min', min.toString());
            await db.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', 'xp_max', max.toString());

            await interaction.reply({ content: `Successfully set XP gain range to **${min}-${max}**.`, ephemeral: true });
        }
    }
};
