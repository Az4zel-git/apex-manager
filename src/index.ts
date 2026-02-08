import { config } from 'dotenv';
// Load config immediately to ensure environment/secrets are available
config();

import { Client, GatewayIntentBits, Events } from 'discord.js';
// config import removed from here
import { logger } from './utils/logger';
import { runSetup } from './scripts/setup';
import { loadEvents } from './events';
import { loadCommands } from './commands';
import { ServerStatsService } from './services/server-stats.service';

import { Branding } from './config/branding';

(async () => {
    logger.info({ event: 'startup', phase: 'init', message: `Starting ${Branding.botName} v${Branding.version}...` });

    // Run interactive setup first
    logger.info({ event: 'startup', phase: 'setup', message: 'Running setup script...' });
    try {
        await runSetup();
    } catch (err) {
        logger.error({ event: 'startup', phase: 'setup', message: 'Setup script encountered an error', error: err });
        // Continue, as this might be non-fatal or just cancellation
    }

    const token = process.env.DISCORD_TOKEN;

    if (!token) {
        logger.error({ event: 'startup', phase: 'env', message: 'DISCORD_TOKEN is not defined' });
        process.exit(1);
    }

    logger.info({ event: 'startup', phase: 'client', message: 'Initializing Discord Client...' });
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMembers,   // Required for member join/leave/update events
            GatewayIntentBits.GuildPresences, // Required for tracking online status / activities
        ]
    });

    // Placeholder for command handling
    // (commands and events will be loaded here)

    logger.info({ event: 'startup', phase: 'events', message: 'Loading events...' });
    loadEvents(client);

    client.once(Events.ClientReady, async () => {
        logger.info({ event: 'startup', phase: 'ready', message: 'Client connection established. Finalizing startup...' });

        try {
            logger.info({ event: 'startup', phase: 'commands', message: 'Loading commands...' });
            await loadCommands();
        } catch (err) {
            logger.error({ event: 'startup', phase: 'commands', message: 'Failed to load commands', error: err });
        }

        // Initialize Services
        try {
            logger.info({ event: 'startup', phase: 'services', message: 'Initializing ServerStatsService...' });
            await ServerStatsService.init(client);
        } catch (err) {
            logger.error({ event: 'startup', phase: 'services', message: 'Failed to initialize ServerStatsService', error: err });
        }

        logger.info(`Logged in as ${client.user?.tag}!`);
    });

    // client.on('interactionCreate', ... ) is now handled by src/events/interactionCreate.ts via loadEvents

    process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception:', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection:', reason);
    });

    try {
        await client.login(token);
    } catch (error) {
        logger.error({ event: 'startup', phase: 'login', message: 'Failed to login', error });
        process.exit(1);
    }

})();
