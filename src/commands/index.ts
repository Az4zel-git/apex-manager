import { Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { Command } from './command.interface';
import { logger } from '../utils/logger';
import addRole from './add-role'; // Added import for addRole

export const commands = new Collection<string, Command>();

export const loadCommands = async () => {
    const commandsPath = path.join(__dirname);
    // Filter for directory or ts/js files, excluding interfaces/index
    const commandFiles = fs.readdirSync(commandsPath).filter(file =>
        (file.endsWith('.ts') || file.endsWith('.js')) &&
        !file.includes('.interface.') &&
        !file.startsWith('index.') &&
        !file.endsWith('.d.ts')
    );

    logger.info(`Found command files: ${commandFiles.join(', ')}`);

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        try {
            const commandModule = await import(filePath);
            const command: Command = commandModule.default || commandModule.command;

            if (!command) {
                logger.warn(`The command at ${filePath} does not export a default command or 'command' object.`);
                continue;
            }

            if ('data' in command && 'execute' in command) {
                commands.set(command.data.name, command);
                logger.info(`Loaded command: ${command.data.name}`);
            } else {
                logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        } catch (error) {
            logger.error(`Error loading command ${file}:`, error);
        }
    }

    // Manually load help command (since it resides outside ./commands)
    try {
        const { helpCommand } = require('../help/help.command');
        if (helpCommand && helpCommand.data && helpCommand.execute) {
            commands.set(helpCommand.data.name, helpCommand);
            logger.info(`Loaded command: ${helpCommand.data.name}`);
        }
    } catch (error) {
        logger.error('Error loading help command:', error);
    }
};
