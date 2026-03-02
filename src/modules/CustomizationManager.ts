import { EmbedBuilder, ColorResolvable } from 'discord.js';
import { Database } from 'sqlite';
import { DatabaseManager } from '../database/db';

export interface CustomizationData {
    feature: string;
    title?: string;
    description?: string;
    color?: number;
    footer?: string;
    thumbnail?: string;
    image?: string;
    success_msg?: string;
    error_msg?: string;
}

export class CustomizationManager {
    private db: Database | null = null;

    private async getDb() {
        if (!this.db) {
            this.db = await DatabaseManager.getInstance();
        }
        return this.db;
    }

    public async get(feature: string): Promise<CustomizationData | null> {
        const db = await this.getDb();
        const result = await db.get('SELECT * FROM customization WHERE feature = ?', feature);
        return result || null;
    }

    public async set(feature: string, data: Partial<CustomizationData>) {
        const db = await this.getDb();
        const existing = await this.get(feature);

        if (existing) {
            const keys = Object.keys(data).filter(k => k !== 'feature');
            const setClause = keys.map(k => `${k} = ?`).join(', ');
            const values = keys.map(k => (data as any)[k]);
            await db.run(`UPDATE customization SET ${setClause} WHERE feature = ?`, ...values, feature);
        } else {
            const keys = ['feature', ...Object.keys(data)];
            const placeholders = keys.map(() => '?').join(', ');
            const values = keys.map(k => (k === 'feature' ? feature : (data as any)[k]));
            await db.run(`INSERT INTO customization (${keys.join(', ')}) VALUES (${placeholders})`, ...values);
        }
    }

    public createEmbed(data: CustomizationData): EmbedBuilder {
        const embed = new EmbedBuilder();
        if (data.title) embed.setTitle(data.title);
        if (data.description) embed.setDescription(data.description);
        if (data.color) embed.setColor(data.color as ColorResolvable);
        if (data.footer) embed.setFooter({ text: data.footer });
        if (data.thumbnail) embed.setThumbnail(data.thumbnail);
        if (data.image) embed.setImage(data.image);
        return embed;
    }

    public async getComponentConfigs(feature: string) {
        const db = await this.getDb();
        return await db.all('SELECT * FROM component_configs WHERE feature = ?', feature);
    }

    public async setComponentConfig(id: string, feature: string, config: any) {
        const db = await this.getDb();
        await db.run(
            `INSERT INTO component_configs (id, feature, label, emoji, style, target_value, metadata) 
             VALUES (?, ?, ?, ?, ?, ?, ?) 
             ON CONFLICT(id) DO UPDATE SET 
             label = excluded.label, emoji = excluded.emoji, style = excluded.style, 
             target_value = excluded.target_value, metadata = excluded.metadata`,
            id, feature, config.label, config.emoji, config.style, config.target_value, JSON.stringify(config.metadata || {})
        );
    }
}
