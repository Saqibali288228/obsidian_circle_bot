import { ObsidianClient } from './client';
import { Logger } from './utils/logger';
import { GDriveSync } from './utils/gdriveSync';

const client = new ObsidianClient();

async function bootstrap() {
    try {
        // 1. Download database from Google Drive before starting
        await GDriveSync.download();

        // 2. Start the bot
        await client.start();
        Logger.success('Bot is online!');

        // 3. Setup graceful shutdown to upload database
        const shutdown = async (signal: string) => {
            Logger.info(`Received ${signal}. Shutting down gracefully...`);
            await GDriveSync.upload();
            process.exit(0);
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));

    } catch (error) {
        Logger.error('Failed to start the bot', error);
        process.exit(1);
    }
}

bootstrap();
