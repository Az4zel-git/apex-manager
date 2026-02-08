import { Events, VoiceState } from 'discord.js';
import { Event } from './event.interface';
import { VoiceService } from '../services/voice.service';
import { StatsService } from '../services/stats.service';
import { logger } from '../utils/logger';

const voiceSessions = new Map<string, number>();

const event: Event<Events.VoiceStateUpdate> = {
    name: Events.VoiceStateUpdate,
    execute: async (oldState: VoiceState, newState: VoiceState) => {
        await VoiceService.handleVoiceStateUpdate(oldState, newState);

        // Check cleanup specifically here where we have the channel objects


        const userId = newState.member?.id || oldState.member?.id;
        if (!userId) return;

        // User Joined (or switched)
        if (newState.channelId && !oldState.channelId) {
            voiceSessions.set(userId, Date.now());
        }

        // User Left (or switched)
        if (!newState.channelId && oldState.channelId) {
            const joinTime = voiceSessions.get(userId);
            if (joinTime) {
                const durationMinutes = Math.floor((Date.now() - joinTime) / 1000 / 60);
                if (durationMinutes > 0 && oldState.member) {
                    await StatsService.trackVoice(oldState.member, durationMinutes);
                }
                voiceSessions.delete(userId);
            }
        }

        // Handling Switch (Treat as bank on old, start new)
        if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            const joinTime = voiceSessions.get(userId);
            if (joinTime) {
                const durationMinutes = Math.floor((Date.now() - joinTime) / 1000 / 60);
                if (durationMinutes > 0 && oldState.member) {
                    await StatsService.trackVoice(oldState.member, durationMinutes);
                }
            }
            voiceSessions.set(userId, Date.now());
        }
    },
};

export default event;
