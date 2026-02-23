import 'dotenv/config';

export const config = {
    token: process.env.DISCORD_TOKEN || '',
    clientId: process.env.CLIENT_ID || '',
    guildId: process.env.GUILD_ID || '',
    prefix: process.env.PREFIX || '!',
    database: {
        path: './database.sqlite'
    },
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirectUri: process.env.GOOGLE_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob',
        folderId: process.env.GOOGLE_FOLDER_ID || '',
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN || ''
    },
    colors: {
        primary: 0x000000, // Obsidian/Black
        success: 0x00ff00,
        error: 0xff0000,
        warning: 0xffff00,
        info: 0x0000ff
    }
};
