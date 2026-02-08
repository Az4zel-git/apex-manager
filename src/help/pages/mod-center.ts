import { HelpPage } from '../help.types';

export const modCenterPage: HelpPage = {
    id: 'mod_center',
    title: '🧑‍💼 Mod Center',
    description: 'Central dashboard for staff performance and health.',
    emoji: '🧑‍💼',
    sections: [
        {
            title: 'What This Does',
            content: 'Provides insights into staff activity to prevent burnout and track performance.'
        },
        {
            title: 'Features',
            content:
                '**Burnout Detector** - Monitors activity levels to suggest breaks.\n' +
                '**Reputation Engine** - `+rep` system and **`/rank`** to gamify good moderation.\n' +
                '**Metrics** - Automated tracking of bans, kicks, and warnings.'
        },
        {
            title: 'Access',
            content: 'Restricted to Staff members.'
        }
    ]
};
