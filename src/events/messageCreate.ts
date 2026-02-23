import { Message, Events } from 'discord.js';
import { ObsidianClient } from '../client';
import { XPManager } from '../modules/xp/XPManager';

export default {
    name: Events.MessageCreate,
    once: false,
    async execute(message: Message, client: ObsidianClient) {
        if (message.author.bot) return;

        const xpManager = new XPManager(client);
        await xpManager.handleMessage(message);
    }
};
