import { Events, Presence } from 'discord.js';
import { Event } from './event.interface';
import { ServerStatsService } from '../services/server-stats.service';

export const event: Event<Events.PresenceUpdate> = {
    name: Events.PresenceUpdate,
    once: false,
    execute: async (oldPresence: Presence | null, newPresence: Presence) => {
        if (!newPresence.guild) return;

        // Trigger fast-path update
        await ServerStatsService.triggerOnlineUpdate(newPresence.client, newPresence.guild.id);
    },
};
