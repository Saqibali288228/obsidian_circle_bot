import { ObsidianClient } from './client';

const client = new ObsidianClient();

client.start().catch(err => {
    console.error('Error starting bot:', err);
});
