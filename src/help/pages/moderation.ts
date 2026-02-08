import { HelpPage } from '../help.types';

export const moderationPage: HelpPage = {
    id: 'moderation',
    title: '🛡️ Moderation & Staff Management',
    description: 'Tools to manage users safely and efficiently.',
    emoji: '🛡️',
    sections: [
        {
            title: 'Core Commands',
            content:
                '**`/slowmode`** - Set channel slowmode.\n' +
                '**`/kick`** - Remove a user from the server.\n' +
                '**`/ban`** - Permanently ban a user.\n' +
                '**`/timeout`** - Temporarily restrict a user.\n' +
                '**`/warn`** - Issue a formal warning.\n' +
                '**`/purge`** - Bulk delete messages.'
        },
        {
            title: 'Safety Net',
            content: 'Use **`/undo`** to revert the most recent moderation action (ban, kick, timeout) in case of mistakes.'
        },
        {
            title: 'Permissions',
            content: 'Requires `Kick Members`, `Ban Members`, or `Manage Messages` permissions depending on the command.'
        }
    ]
};
