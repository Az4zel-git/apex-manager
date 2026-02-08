import { Client } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { Event } from './event.interface';

export const loadEvents = (client: Client) => {
    const eventsPath = path.join(__dirname);

    const eventFiles = fs.readdirSync(eventsPath).filter(file =>
        (file.endsWith('.ts') || file.endsWith('.js')) &&
        !file.includes('interface') &&
        !file.endsWith('index.ts') &&
        !file.endsWith('index.js')
    );

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const eventModule = require(filePath);
            const event: Event<any> = eventModule.default || eventModule.event;

            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args));
            } else {
                client.on(event.name, (...args) => event.execute(...args));
            }
            logger.info(`Loaded event: ${event.name} from ${file}`);
        } catch (error) {
            logger.error(`Error loading event ${file}:`, error);
        }
    }
};
