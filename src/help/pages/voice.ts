import { HelpPage } from '../help.types';

export const voicePage: HelpPage = {
    id: 'voice',
    title: '🔊 Voice & Channels',
    description: 'Dynamic "Join to Create" voice channels.',
    emoji: '🔊',
    sections: [
        {
            title: 'Join to Create',
            content: 'Join the designated "Hub" channel to automatically create your own temporary voice channel. It deletes itself when everyone leaves.'
        },
        {
            title: 'Management',
            content: 'Channel owners can lock, unlock, or hide their temporary channels.'
        }
    ]
};
