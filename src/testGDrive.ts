const { GDriveSync } = require('./utils/gdriveSync');
const { Logger } = require('./utils/logger');
const fs = require('fs');
const path = require('path');
const { config } = require('./config/config');

async function test() {
    const dbPath = path.resolve(process.cwd(), config.database.path);
    
    // 1. Create a dummy database file if it doesn't exist
    if (!fs.existsSync(dbPath)) {
        Logger.info('Creating dummy database for testing...');
        fs.writeFileSync(dbPath, 'dummy data for testing google drive sync');
    }

    // 2. Test Upload
    Logger.info('--- Testing Upload ---');
    await GDriveSync.upload();

    // 3. Delete local file and test Download
    Logger.info('--- Testing Download ---');
    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        Logger.info('Deleted local database file. Attempting to download...');
    }
    
    await GDriveSync.download();

    if (fs.existsSync(dbPath)) {
        Logger.success('Test PASSED: Database was successfully synced with Google Drive.');
    } else {
        Logger.error('Test FAILED: Database was not found after download.');
    }
}

test().catch(err => {
    Logger.error('Test failed with error', err);
});
