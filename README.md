# Obsidian Circle Bot

Obsidian Circle Bot is a premium, all-in-one Discord management system designed for professional and commercial use. It combines moderation, tickets, verification, self-roles, giveaways, XP leveling, and automation into one cohesive product.

## Features

- **Full Customization**: Every user-facing aspect of the bot (text, embeds, buttons, colors, emojis) is fully customizable via commands, ensuring no hardcoded elements.
- **Persistent Configuration**: All customization settings are stored persistently in a database and applied dynamically.
- **Ticket System**: Button-based ticket creation with multiple categories and claim functionality. Fully customizable panel embeds, button labels, emojis, colors, and reason texts. Customizable messages for ticket creation, claiming, and closing.
- **Self-Roles**: Button-based role assignment with toggle behavior. Fully customizable panel embeds, button labels, emojis, and colors. Customizable toggle messages.
- **Verification**: Image captcha-based verification gate for new members.
- **Giveaways**: Button-based giveaway entry with automatic ending and winner selection. Customizable embed title, description, color, entry button label, and winner announcement text.
- **XP & Leveling**: Message-based XP gain with levels and leaderboards. Prepared for customization of XP gain range and level-up messages.
- **Moderation**: Warn system, kick, ban, message clearing, and channel locking.
- **Slash Commands**: All commands are implemented as Discord Slash Commands.
- **Persistence**: Data survives restarts using a SQLite database.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16.11.0 or higher)
- [pnpm](https://pnpm.io/) (v7.0.0 or higher)
- A Discord Bot Token (from the [Discord Developer Portal](https://discord.com/developers/applications))

## Setup

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd obsidian-circle-bot
    ```

2.  **Install dependencies**:
    ```bash
    pnpm install
    ```

3.  **Configure the bot**:
    Create a `.env` file in the root directory and add your bot token and other details:
    ```env
    DISCORD_TOKEN=your_bot_token
    CLIENT_ID=your_bot_client_id
    GUILD_ID=your_guild_id
    PREFIX=/
    ```

4.  **Register Slash Commands**:
    ```bash
    pnpm run register
    ```

5.  **Start the bot**:
    ```bash
    pnpm start
    ```

## Development

- **Run in development mode (with hot-reload)**:
  ```bash
  pnpm run dev
  ```

## Commands

- `/configure embed set <feature> [title] [description] [color] [footer] [thumbnail] [image]`: Customize the embed for a specific feature (e.g., `tickets`, `roles`, `giveaways`).
- `/configure message set <feature> [success] [error]`: Customize success and error messages for a specific feature.
- `/configure xp range <min> <max>`: Set the minimum and maximum XP gained per message (XP logic not yet implemented).
- `/ticket setup <channel>`: Setup the ticket panel in the specified channel. The panel will display buttons configured via `/ticket add-button`.
- `/ticket add-button <id> <label> <reason> [emoji] [style]`: Add a customizable button to the ticket panel. `id` must be unique. `reason` is the text displayed in the ticket channel.
- `/ticket close`: Close the current ticket.
- `/ticket add <user>`: Add a user to the current ticket.
- `/role setup <channel>`: Setup a self-claimable role panel in the specified channel. The panel will display buttons configured via `/role add-button`.
- `/role add-button <id> <role> [label] [emoji] [style]`: Add a customizable button for a specific role to the role panel. `id` must be unique.
- `/verify setup`: Setup the verification gate.
- `/giveaway start <prize> <winners> <duration> <host>`: Start a new giveaway. The embed and button are customizable via `/configure`.
- `/level rank`: Check your current rank and XP.
- `/level leaderboard`: View the top 10 users by XP.
- `/mod warn <user> <reason>`: Warn a user.
- `/mod kick <user> <reason>`: Kick a user.
- `/mod ban <user> <reason>`: Ban a user.
- `/mod clear <amount>`: Clear a specific number of messages.
- `/mod lock`: Lock the current channel.
- `/mod unlock`: Unlock the current channel.
- `/help`: Get a list of all commands.

## License

This project is intended for professional and commercial use. All rights reserved.
