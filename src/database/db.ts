import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { config } from '../config/config';
import * as path from 'path';

export class DatabaseManager {
    private static instance: Database;

    public static async getInstance(): Promise<Database> {
        if (!this.instance) {
            this.instance = await open({
                filename: config.database.path,
                driver: sqlite3.Database
            });
            await this.init();
        }
        return this.instance;
    }

    private static async init() {
        // Initialize tables for different systems
        await this.instance.exec(`
            -- Tickets
            CREATE TABLE IF NOT EXISTS tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                reason TEXT,
                status TEXT DEFAULT 'open',
                claimed_by TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            -- Global Counters (for ticket numbers)
            CREATE TABLE IF NOT EXISTS counters (
                key TEXT PRIMARY KEY,
                value INTEGER DEFAULT 0
            );

            -- XP & Leveling
            CREATE TABLE IF NOT EXISTS xp (
                user_id TEXT PRIMARY KEY,
                xp INTEGER DEFAULT 0,
                level INTEGER DEFAULT 0,
                last_message_at DATETIME
            );

            -- Giveaways
            CREATE TABLE IF NOT EXISTS giveaways (
                message_id TEXT PRIMARY KEY,
                channel_id TEXT NOT NULL,
                prize TEXT NOT NULL,
                winners_count INTEGER NOT NULL,
                end_time DATETIME NOT NULL,
                host_id TEXT NOT NULL,
                status TEXT DEFAULT 'active'
            );

            -- Moderation (Warnings)
            CREATE TABLE IF NOT EXISTS warnings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                moderator_id TEXT NOT NULL,
                reason TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            -- Configurable Settings & Global Customization
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );

            -- Feature Customization Templates (Embeds, Messages)
            CREATE TABLE IF NOT EXISTS customization (
                feature TEXT PRIMARY KEY,
                title TEXT,
                description TEXT,
                color INTEGER,
                footer TEXT,
                thumbnail TEXT,
                image TEXT,
                success_msg TEXT,
                error_msg TEXT
            );

            -- Modular Button/Reaction Configurations
            CREATE TABLE IF NOT EXISTS component_configs (
                id TEXT PRIMARY KEY,
                feature TEXT NOT NULL,
                label TEXT,
                emoji TEXT,
                style TEXT,
                target_value TEXT,
                metadata TEXT
            );
        `);

        // Initialize ticket counter if not exists
        await this.instance.run('INSERT OR IGNORE INTO counters (key, value) VALUES (?, ?)', 'ticket_number', 0);
    }
}
