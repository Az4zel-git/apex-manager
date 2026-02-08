import { Events, GuildMember, PartialGuildMember } from 'discord.js';
import { Event } from './event.interface';
import { ServerStatsService } from '../services/server-stats.service';

export const event: Event<Events.GuildMemberRemove> = {
    name: Events.GuildMemberRemove,
    once: false,
    execute: async (member: GuildMember | PartialGuildMember) => {
        await ServerStatsService.triggerOnlineUpdate(member.client, member.guild.id);
    },
};
