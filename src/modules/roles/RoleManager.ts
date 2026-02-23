import { ButtonInteraction, GuildMember, Role } from 'discord.js';
import { ObsidianClient } from '../../client';
import { Logger } from '../../utils/logger';

export class RoleManager {
    private client: ObsidianClient;

    constructor(client: ObsidianClient) {
        this.client = client;
    }

    public async toggleRole(interaction: ButtonInteraction, roleId: string) {
        const member = interaction.member as GuildMember;
        const guild = interaction.guild;
        if (!guild || !member) return;

        const role = guild.roles.cache.get(roleId);
        if (!role) {
            return interaction.reply({ content: 'Role not found. Please contact an administrator.', ephemeral: true });
        }

        // Check bot permissions
        const botMember = guild.members.me;
        if (!botMember || !botMember.permissions.has('ManageRoles') || role.position >= botMember.roles.highest.position) {
            return interaction.reply({ content: 'I do not have permission to manage this role.', ephemeral: true });
        }

        try {
            const { CustomizationManager } = require('../CustomizationManager');
            const customization = new CustomizationManager();
            const config = await customization.get('roles');

            if (member.roles.cache.has(roleId)) {
                await member.roles.remove(roleId);
                const msg = config?.success_msg?.replace('{role}', role.name).replace('{action}', 'Removed') || `Removed role: **${role.name}**`;
                await interaction.reply({ content: msg, ephemeral: true });
            } else {
                await member.roles.add(roleId);
                const msg = config?.success_msg?.replace('{role}', role.name).replace('{action}', 'Added') || `Added role: **${role.name}**`;
                await interaction.reply({ content: msg, ephemeral: true });
            }
        } catch (error) {
            Logger.error('Failed to toggle role', error);
            const { CustomizationManager } = require('../CustomizationManager');
            const customization = new CustomizationManager();
            const config = await customization.get('roles');
            const errorMsg = config?.error_msg || 'Failed to toggle role. Please check my permissions.';
            await interaction.reply({ content: errorMsg, ephemeral: true });
        }
    }
}
