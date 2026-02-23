import { Client, GatewayIntentBits, Collection, Interaction, ChatInputCommandInteraction, REST, Routes } from 'discord.js';
import { config } from './config/config';
import { DatabaseManager } from './database/db';
import * as fs from 'fs';
import * as path from 'path';

export class ObsidianClient extends Client {
    public commands: Collection<string, any> = new Collection();
    public db: any;

    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildMessageReactions
            ]
        });
    }

    public async start() {
        // Initialize Database
        this.db = await DatabaseManager.getInstance();

        // Load Events
        await this.loadEvents();

        // Load Commands
        await this.loadCommands();

        // Login
        await this.login(config.token);
    }

    private async loadEvents() {
        const eventsPath = path.join(__dirname, 'events');
        if (!fs.existsSync(eventsPath)) return;
        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

        for (const file of eventFiles) {
            const event = require(`./events/${file}`).default;
            if (event.once) {
                this.once(event.name, (...args) => event.execute(...args, this));
            } else {
                this.on(event.name, (...args) => event.execute(...args, this));
            }
        }
    }

    private async loadCommands() {
        const commandsPath = path.join(__dirname, 'commands');
        if (!fs.existsSync(commandsPath)) return;
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

        for (const file of commandFiles) {
            const command = require(`./commands/${file}`).default;
            this.commands.set(command.data.name, command);
        }
    }

    public async registerCommands() {
        const rest = new REST({ version: '10' }).setToken(config.token);
        try {
            console.log('Started refreshing application (/) commands.');
            await rest.put(
                Routes.applicationGuildCommands(config.clientId, config.guildId),
                { body: this.commands.map(c => c.data.toJSON()) }
            );
            console.log('Successfully reloaded application (/) commands.');
        } catch (error) {
            console.error(error);
        }
    }
}
