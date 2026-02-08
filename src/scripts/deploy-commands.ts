import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Command } from '../commands/command.interface';
import { logger } from '../utils/logger';

config();

const commands: any[] = [];
// Adjust path to point to src/commands
const commandsPath = path.join(__dirname, '../commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file =>
    (file.endsWith('.ts') || file.endsWith('.js')) &&
    !file.includes('.interface.') &&
    !file.startsWith('index.') &&
    !file.endsWith('.d.ts')
);

(async () => {
    logger.info(`Found command files: ${commandFiles.join(', ')}`);

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        try {
            logger.info(`Loading ${file}...`);
            const commandModule = await import(filePath);
            const command: Command = commandModule.default || commandModule.command;

            if (!command) {
                logger.warn(`[WARNING] The command at ${filePath} has no export.`);
                continue;
            }

            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
                logger.info(`Valid command found: ${command.data.name}`);
            } else {
                logger.warn(`[WARNING] The command at ${filePath} is missing "data" or "execute". Keys: ${Object.keys(command)}`);
            }
        } catch (err) {
            logger.error(`FAILED to load ${file}:`, err);
        }
    }

    // Manually load help command
    try {
        const { helpCommand } = require('../help/help.command');
        if (helpCommand && helpCommand.data && helpCommand.execute) {
            commands.push(helpCommand.data.toJSON());
            logger.info(`Valid command found: ${helpCommand.data.name} (Manual Load)`);
        }
    } catch (err) {
        logger.error('Failed to load help command:', err);
    }

    const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

    try {
        logger.info(`Started refreshing ${commands.length} application (/) commands.`);

        // 1. Always deploy Global Commands (for all servers)
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID!),
            { body: commands },
        );
        logger.info(`Successfully reloaded Global application (/) commands.`);

    } catch (error) {
        logger.error('Error deploying commands:', error);
    }
})();
