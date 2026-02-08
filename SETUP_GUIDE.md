# Setup Guide

## Prerequisites
- Node.js v18 or higher
- PostgreSQL Database
- Discord Bot Token (from Developer Portal)

## 1. Discord Developer Portal Setup

Before installing the code, you need to create the bot application.

1.  **Create Application**:
    - Go to [Discord Developer Portal](https://discord.com/developers/applications).
    - Click **New Application** (top right).
    - Name it (e.g., "Apex Manager") and click **Create**.

2.  **Create Bot User**:
    - In the left sidebar, click **Bot**.
    - Click **Reset Token** to generate your `DISCORD_TOKEN`. **Copy this safely**; it wont be shown again.
    - **Privileged Gateway Intents**: Scroll down and enable:
        - [x] **Server Members Intent**
        - [x] **Message Content Intent**
        - [x] **Presence Intent**
    - Click **Save Changes**.

3.  **Invite Link**:
    - Click **OAuth2** -> **URL Generator**.
    - Scopes: check `bot` and `applications.commands`.
    - Permissions: check **Administrator** (e.g. for easy setup) or manually select Moderation/Voice permissions.
    - Copy the generated URL and invite the bot to your server.

## 2. Installation

1.  **Clone or Download** the source code.
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Environment Variables**:
    - Copy `.env.example` to `.env`.
    - Fill in `DISCORD_TOKEN`, `DATABASE_URL`, and other required fields.
4.  **Database Setup**:
    ```bash
    npx prisma generate
    npx prisma db push
    ```

## Starting the Bot

Run the following commands to build and start the bot in production mode:

```bash
npm run build
npm run deploy:commands
npm start
```

For development (hot-reload):

```bash
npm run dev
```

## First-Time Setup in Discord

Once the bot is online:

1.  Type `/setup` in your server.
2.  Follow the interactive menu to configure:
    - Admin/Mod Roles
    - Logging Channels
    - Features (Server Stats, Tickets, Auto-Welcome, etc.)

## Troubleshooting

-   **Database Errors**: Ensure your PostgreSQL server is running and the credentials in `.env` are correct.
-   **Missing Intents**: Go to the Discord Developer Portal -> Bot -> Privileged Gateway Intents and enable **Server Members Intent**, **Message Content Intent**, and **Presence Intent**.
