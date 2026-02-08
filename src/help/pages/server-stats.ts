import { HelpPage } from '../help.types';

export const serverStatsPage: HelpPage = {
    id: 'server_stats',
    title: '📊 Server Statistics',
    description: 'Live counters for your server.',
    emoji: '📊',
    sections: [
        {
            title: 'Overview',
            content: 'Displays live data as locked voice or text channels at the top of your server list.'
        },
        {
            title: 'Available Counters',
            content:
                '• Total Members\n' +
                '• Online Members\n' +
                '• Staff Online\n' +
                '• Bot Count'
        },
        {
            title: 'Setup',
            content: 'Use **`/setup`** to enable and configure counters.'
        }
    ]
};
