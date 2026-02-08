import { PermissionFlagsBits } from 'discord.js';
import { HelpPage } from '../help.types';

export const setupPage: HelpPage = {
    id: 'setup',
    title: '⚙️ Setup & Configuration',
    description: 'Configure bot modules directly in Discord.',
    emoji: '⚙️',
    sections: [
        {
            title: 'Guided Setup',
            content: 'Run **`/setup`** to open the interactive configuration wizard. No need to edit files.'
        },
        {
            title: 'Modules',
            content:
                '• **General**: Logging channels, prefixes.\n' +
                '• **Roles**: Admin/Mod role configuration.\n' +
                '• **Stats**: Live counter settings.'
        }
    ],
    requiredPermissions: [PermissionFlagsBits.Administrator],
    adminOnly: true
};
