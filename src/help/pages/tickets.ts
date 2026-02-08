import { HelpPage } from '../help.types';

export const ticketsPage: HelpPage = {
    id: 'tickets',
    title: '🎫 Tickets & Support',
    description: 'Private support channels for your members.',
    emoji: '🎫',
    sections: [
        {
            title: 'How it Works',
            content: 'Users can open private tickets to chat with staff. Includes categories and auto-assignment.'
        },
        {
            title: 'Commands',
            content:
                '**`/ticket create`** - Manually open a ticket.\n' +
                '**`/ticket close`** - Close and archive a ticket.\n' +
                '**`/ticket assign`** - Assign a specific staff member.'
        }
    ]
};
