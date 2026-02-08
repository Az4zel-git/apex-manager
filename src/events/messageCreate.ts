import { Events, Message } from 'discord.js';
import { Event } from './event.interface';
import { StatsService } from '../services/stats.service';

const event: Event<Events.MessageCreate> = {
    name: Events.MessageCreate,
    execute: async (message: Message) => {
        if (message.author.bot) return;
        if (!message.guild) return;

        await StatsService.trackMessage(message.member!);
    },
};

export default event;
