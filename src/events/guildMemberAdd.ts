import { Events, GuildMember } from 'discord.js';
import { Event } from './event.interface';
import { ServerStatsService } from '../services/server-stats.service';
import { WelcomeService } from '../services/welcome.service';

export const event: Event<Events.GuildMemberAdd> = {
    name: Events.GuildMemberAdd,
    once: false,
    execute: async (member: GuildMember) => {
        // Trigger fast-path update (in case they joined online)
        await ServerStatsService.triggerOnlineUpdate(member.client, member.guild.id);

        // Trigger Welcome
        await WelcomeService.handleMemberJoin(member);

        // Note: New total member count will update on next background tick (2 mins)
    },
};
