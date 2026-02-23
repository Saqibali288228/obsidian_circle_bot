import { 
    ButtonInteraction, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    AttachmentBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ModalSubmitInteraction
} from 'discord.js';
import { createCanvas } from 'canvas';
import { ObsidianClient } from '../../client';
import { Logger } from '../../utils/logger';
import { config } from '../../config/config';

export class VerificationManager {
    private client: ObsidianClient;
    private sessions: Map<string, string> = new Map();

    constructor(client: ObsidianClient) {
        this.client = client;
    }

    public async startVerification(interaction: ButtonInteraction) {
        const captcha = Math.random().toString(36).slice(2, 8).toUpperCase();
        this.sessions.set(interaction.user.id, captcha);

        const canvas = createCanvas(200, 100);
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 200, 100);

        // Noise
        for (let i = 0; i < 50; i++) {
            ctx.strokeStyle = `rgb(${Math.random()*255},${Math.random()*255},${Math.random()*255})`;
            ctx.beginPath();
            ctx.moveTo(Math.random() * 200, Math.random() * 100);
            ctx.lineTo(Math.random() * 200, Math.random() * 100);
            ctx.stroke();
        }

        // Text
        ctx.font = 'bold 40px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(captcha, 100, 60);

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'captcha.png' });

        const embed = new EmbedBuilder()
            .setTitle('Verification Required')
            .setDescription('Please click the button below and enter the code shown in the image.')
            .setColor(config.colors.primary)
            .setImage('attachment://captcha.png');

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('verify_submit')
                    .setLabel('Submit Code')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.reply({ embeds: [embed], files: [attachment], components: [row], ephemeral: true });
    }

    public async showModal(interaction: ButtonInteraction) {
        const modal = new ModalBuilder()
            .setCustomId('verify_modal')
            .setTitle('Verification');

        const input = new TextInputBuilder()
            .setCustomId('captcha_input')
            .setLabel('Enter the code from the image')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(6)
            .setMaxLength(6);

        const row = new ActionRowBuilder<TextInputBuilder>().addComponents(input);
        modal.addComponents(row);

        await interaction.showModal(modal);
    }

    public async verify(interaction: ModalSubmitInteraction) {
        const input = interaction.fields.getTextInputValue('captcha_input').toUpperCase();
        const expected = this.sessions.get(interaction.user.id);

        if (input === expected) {
            this.sessions.delete(interaction.user.id);
            
            // Assign verified role
            const guild = interaction.guild;
            const verifiedRole = guild?.roles.cache.find(r => r.name === 'Verified');
            
            if (verifiedRole) {
                await (interaction.member as any).roles.add(verifiedRole);
                await interaction.reply({ content: 'Verification successful! You now have access to the server.', ephemeral: true });
            } else {
                await interaction.reply({ content: 'Verification successful, but the "Verified" role was not found.', ephemeral: true });
            }
        } else {
            await interaction.reply({ content: 'Incorrect code. Please try again.', ephemeral: true });
        }
    }
}
