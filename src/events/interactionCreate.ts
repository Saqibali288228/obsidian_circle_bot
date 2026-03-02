import { Interaction, Events } from 'discord.js';
import { ObsidianClient } from '../client';
import { Logger } from '../utils/logger';

export default {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction: Interaction, client: ObsidianClient) {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction, client);
            } catch (error) {
                Logger.error(`Error executing command: ${interaction.commandName}`, error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                }
            }
        } else if (interaction.isButton()) {
            // All button interactions should be handled here or deferred if complex
            try {
                if (interaction.customId.startsWith('ticket_btn:')) {
                    const buttonId = interaction.customId.split(':')[1];
                    const binding = await client.db.get('SELECT * FROM ticket_bindings WHERE message_id = ? AND custom_id = ?', interaction.message.id, buttonId);
                    if (binding) {
                        const { TicketManager } = require('../modules/tickets/TicketManager');
                        await new TicketManager(client).createTicket(interaction, binding);
                    }
                } else if (interaction.customId === 'ticket_close') {
                    const { TicketManager } = require('../modules/tickets/TicketManager');
                    await new TicketManager(client).closeTicket(interaction);
                } else if (interaction.customId === 'ticket_add_user') {
                    // We'll use a modal or a simple message for adding users if triggered by button
                    await interaction.reply({ content: 'Use `/ticket add @user` to add someone to this ticket.', ephemeral: true });
                } else if (interaction.customId === 'ticket_claim') {
                    const { TicketManager } = require('../modules/tickets/TicketManager');
                    await new TicketManager(client).claimTicket(interaction);
                } else if (interaction.customId.startsWith('role_toggle:')) {
                    const { RoleManager } = require('../modules/roles/RoleManager');
                    await new RoleManager(client).toggleRole(interaction, interaction.customId.split(':')[1]);
                } else if (interaction.customId === 'verify_start') {
                    const { VerificationManager } = require('../modules/verification/VerificationManager');
                    await new VerificationManager(client).startVerification(interaction);
                } else if (interaction.customId === 'verify_submit') {
                    const { VerificationManager } = require('../modules/verification/VerificationManager');
                    await new VerificationManager(client).showModal(interaction);
                } else if (interaction.customId === 'giveaway_join') {
                    const { GiveawayManager } = require('../modules/giveaways/GiveawayManager');
                    await new GiveawayManager(client).joinGiveaway(interaction);
                }
            } catch (error) {
                Logger.error(`Button interaction failed: ${interaction.customId}`, error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: 'Interaction failed. Please try again.', ephemeral: true });
                }
            }
        } else if (interaction.isModalSubmit()) {
            if (interaction.customId === 'verify_modal') {
                const { VerificationManager } = require('../modules/verification/VerificationManager');
                const verificationManager = new VerificationManager(client);
                await verificationManager.verify(interaction);
            }
        }
    }
};
