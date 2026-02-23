import { Events, Client } from 'discord.js';
import { Logger } from '../utils/logger';

export default {
    name: Events.ClientReady,
    once: true,
    async execute(client: Client) {
        Logger.success(`Bot is ready! Logged in as ${client.user?.tag}`);
    }
};
