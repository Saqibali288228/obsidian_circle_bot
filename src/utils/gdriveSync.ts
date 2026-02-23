import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { config } from '../config/config';
import { Logger } from './logger';

const execPromise = promisify(exec);
const GDRIVE_REMOTE = 'fly_google_drive';
const RCLONE_CONFIG_PATH = path.resolve(process.cwd(), 'rclone.conf');
const DB_PATH = path.resolve(process.cwd(), config.database.path);

export class GDriveSync {
    /**
     * Generates a temporary rclone configuration file using environment variables.
     */
    private static async ensureRcloneConfig() {
        const { google } = config;
        if (!google.clientId || !google.clientSecret || !google.refreshToken) {
            throw new Error('Missing Google Drive API credentials in environment variables.');
        }

        const rcloneConfig = `
[${GDRIVE_REMOTE}]
type = drive
client_id = ${google.clientId}
client_secret = ${google.clientSecret}
scope = drive
token = {"access_token":"","token_type":"Bearer","refresh_token":"${google.refreshToken}","expiry":"2020-01-01T00:00:00Z"}
root_folder_id = ${google.folderId}
`;
        fs.writeFileSync(RCLONE_CONFIG_PATH, rcloneConfig.trim());
    }

    /**
     * Downloads the database from Google Drive.
     */
    public static async download() {
        try {
            await this.ensureRcloneConfig();
            Logger.info('Checking for database on Google Drive...');
            
            // rclone copy remote:file local_dir
            const command = `rclone copy "${GDRIVE_REMOTE}:" "${path.dirname(DB_PATH)}" --include "${path.basename(DB_PATH)}" --config "${RCLONE_CONFIG_PATH}"`;
            await execPromise(command);
            
            if (fs.existsSync(DB_PATH)) {
                Logger.success('Database downloaded from Google Drive.');
            } else {
                Logger.info('No database found on Google Drive. Starting fresh.');
            }
        } catch (error) {
            Logger.error('Failed to download database from Google Drive', error);
        }
    }

    /**
     * Uploads the local database to Google Drive.
     */
    public static async upload() {
        try {
            if (!fs.existsSync(DB_PATH)) {
                Logger.warn('No local database found to upload.');
                return;
            }

            await this.ensureRcloneConfig();
            Logger.info('Uploading database to Google Drive...');
            
            const command = `rclone copy "${DB_PATH}" "${GDRIVE_REMOTE}:" --config "${RCLONE_CONFIG_PATH}"`;
            await execPromise(command);
            Logger.success('Database uploaded to Google Drive.');
        } catch (error) {
            Logger.error('Failed to upload database to Google Drive', error);
        }
    }
}
