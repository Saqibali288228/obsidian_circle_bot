import { ObsidianClient } from './client';
import { Logger } from './utils/logger';

const client = new ObsidianClient();

async function register() {
    Logger.info('Starting command registration...');
    await client.start();
    await client.registerCommands();
    Logger.success('Command registration complete.');
    process.exit(0);
}

register().catch(err => {
    Logger.error('Failed to register commands', err);
    process.exit(1);
});
