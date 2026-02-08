import { prisma } from '../db';
import { GuildMember, TextChannel, EmbedBuilder, Colors } from 'discord.js';
import { logger } from '../utils/logger';

export class ModerationService {
    static async logAction(guildId: string, moderator: GuildMember, target: GuildMember | { id: string, tag: string }, action: string, reason: string) {
        try {
            await prisma.case.create({
                data: {
                    guildId,
                    moderatorId: moderator.id,
                    targetId: target.id,
                    action,
                    reason,
                },
            });

            // TODO: Send embed to log channel if configured
            logger.info(`Moderation Action: ${action} on ${target.id} by ${moderator.id} for ${reason}`);
        } catch (error) {
            logger.error('Failed to log moderation action:', error);
        }
    }

    static async warn(moderator: GuildMember, target: GuildMember, reason: string) {
        // DM the user
        try {
            await target.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.Yellow)
                        .setTitle(`You have been warned in ${moderator.guild.name}`)
                        .setDescription(`Reason: ${reason}`)
                ]
            });
        } catch (dmError) {
            logger.warn(`Could not DM user ${target.id}`);
        }

        await this.logAction(moderator.guild.id, moderator, target, 'WARN', reason);
        return true;
    }

    static async kick(moderator: GuildMember, target: GuildMember, reason: string) {
        if (!target.kickable) return false;

        await target.kick(reason);
        await this.logAction(moderator.guild.id, moderator, target, 'KICK', reason);
        return true;
    }

    static async ban(moderator: GuildMember, target: GuildMember, reason: string) {
        if (!target.bannable) return false;

        await target.ban({ reason });
        await this.logAction(moderator.guild.id, moderator, target, 'BAN', reason);
        return true;
    }

    static async timeout(moderator: GuildMember, target: GuildMember, durationMinutes: number, reason: string) {
        if (!target.moderatable) return false;

        const durationMs = durationMinutes * 60 * 1000;
        await target.timeout(durationMs, reason);
        await this.logAction(moderator.guild.id, moderator, target, 'TIMEOUT', `${reason} (${durationMinutes}m)`);
        return true;
    }

    static async purge(moderator: GuildMember, channel: TextChannel, amount: number) {
        // Bulk delete messages
        const deleted = await channel.bulkDelete(amount, true);

        // We log slightly differently for purge as there is no single target
        // We could create a special case or just log a "PURGE" action with a dummy target or updated schema
        // For simplicity/schema compliance, we skip detailed DB logging for purge or use a system ID
        // Here we just log to console
        logger.info(`PURGE: ${deleted.size} messages in ${channel.name} by ${moderator.user.tag}`);
        return deleted.size;
    }
}
