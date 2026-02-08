import { HelpPage } from '../help.types';

export const autorolePage: HelpPage = {
    id: 'autorole',
    title: '🎭 Auto-Roles',
    description: 'Automatic role assignment.',
    emoji: '🎭',
    sections: [
        {
            title: 'Features',
            content: 'Automatically assign roles to new members when they join.'
        },
        {
            title: 'Configuration',
            content: 'Use **`/autorole`** to manage rules.'
        }
    ]
};
