# Google Drive Integration for Obsidian Circle Bot

This document outlines the integration of Google Drive as a persistent storage solution for the Obsidian Circle Bot's SQLite database. This ensures that your bot's data is automatically backed up to Google Drive and restored upon startup, providing data persistence and disaster recovery capabilities.

## How it Works

The integration leverages `rclone` to synchronize the bot's local `database.sqlite` file with a dedicated folder on your Google Drive. The synchronization process is designed to occur at two key points in the bot's lifecycle:

1.  **Bot Startup**: When the bot starts, it first attempts to download the `database.sqlite` file from Google Drive. If a database file exists on Google Drive, it will be downloaded and used as the bot's local database. If no file is found, the bot will start with a fresh database.
2.  **Bot Shutdown**: Upon graceful shutdown (e.g., via `SIGINT` or `SIGTERM` signals), the bot automatically uploads its current `database.sqlite` file to Google Drive, overwriting the previous version. This ensures that all changes made during the bot's operation are saved.

## Configuration

No additional configuration is required within the bot's code for Google Drive integration, as it utilizes the pre-configured `rclone` setup in the sandbox environment. The bot will automatically look for and sync with the `manus_google_drive` remote.

### Database Location on Google Drive

The bot's database file (`database.sqlite`) will be stored in a folder named `obsidian_bot_data` within your Google Drive root directory. If this folder does not exist, `rclone` will create it automatically during the first upload.

## Testing the Integration

A dedicated script `src/testGDrive.ts` has been created to verify the Google Drive synchronization functionality. This script performs the following actions:

1.  Creates a dummy `database.sqlite` file if one does not exist locally.
2.  Uploads the local database file to Google Drive.
3.  Deletes the local database file.
4.  Downloads the database file from Google Drive.
5.  Verifies that the database file was successfully downloaded.

To run the test, navigate to the bot's root directory in the terminal and execute:

```bash
pnpm ts-node --transpile-only src/testGDrive.ts
```

Successful execution will show messages indicating the upload and download operations, concluding with a "Test PASSED" message.

## Important Notes

*   **Data Consistency**: The current implementation performs a full overwrite of the database file during upload. This means the latest state of the local database will always replace the version on Google Drive.
*   **Manual Intervention**: In case of unexpected bot termination, the last successful upload to Google Drive will be the most recent backup. Manual intervention might be required to restore the database if the local file is corrupted and the bot did not shut down gracefully.
*   **Rclone Configuration**: The `rclone` configuration (`/home/ubuntu/.gdrive-rclone.ini`) is managed by the sandbox environment and should not be modified.
