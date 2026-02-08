import { GuildMember, Role } from 'discord.js';
import { prisma } from '../db';
import { logger } from '../utils/logger';

export class StatsService {

    // --- Tracking Methods ---

    static async trackMessage(member: GuildMember) {
        if (member.user.bot) return;

        const guildId = member.guild.id;
        const userId = member.id;

        try {
            const stats = await prisma.memberStats.upsert({
                where: { guildId_userId: { guildId, userId } },
                update: {
                    messagesTotal: { increment: 1 },
                    messagesWeekly: { increment: 1 },
                },
                create: {
                    guildId,
                    userId,
                    messagesTotal: 1,
                    messagesWeekly: 1,
                    joinedAt: member.joinedAt || new Date(),
                }
            });

            await this.checkPermanentRoles(member, stats);
        } catch (error) {
            logger.error(`Error tracking message for ${userId}:`, error);
        }
    }

    static async trackVoice(member: GuildMember, minutes: number) {
        if (member.user.bot || minutes <= 0) return;

        const guildId = member.guild.id;
        const userId = member.id;

        try {
            const stats = await prisma.memberStats.upsert({
                where: { guildId_userId: { guildId, userId } },
                update: {
                    voiceMinutesTotal: { increment: minutes },
                    voiceMinutesWeekly: { increment: minutes },
                },
                create: {
                    guildId,
                    userId,
                    voiceMinutesTotal: minutes,
                    voiceMinutesWeekly: minutes,
                    joinedAt: member.joinedAt || new Date(),
                }
            });

            await this.checkPermanentRoles(member, stats);
        } catch (error) {
            logger.error(`Error tracking voice for ${userId}:`, error);
        }
    }

    static async addReputation(target: GuildMember, from: GuildMember, reason: string) {
        if (target.user.bot) return false;

        try {
            const stats = await prisma.memberStats.upsert({
                where: { guildId_userId: { guildId: target.guild.id, userId: target.id } },
                update: { reputation: { increment: 1 } },
                create: {
                    guildId: target.guild.id,
                    userId: target.id,
                    reputation: 1,
                    joinedAt: target.joinedAt || new Date()
                }
            });

            await this.checkPermanentRoles(target, stats);
            return true;
        } catch (error) {
            logger.error(`Error adding rep to ${target.id}:`, error);
            return false;
        }
    }

    // --- Role Logic ---

    static async checkPermanentRoles(member: GuildMember, stats: any) {
        // Fetch rules for this guild
        const rules = await prisma.autoRoleRule.findMany({
            where: { guildId: member.guild.id }
        });

        if (rules.length === 0) return;

        const now = new Date();
        const joinedAt = stats.joinedAt || member.joinedAt || now;
        const daysSinceJoin = Math.floor((now.getTime() - new Date(joinedAt).getTime()) / (1000 * 60 * 60 * 24));

        for (const rule of rules) {
            let qualified = false;

            switch (rule.type) {
                case 'MESSAGES':
                    if (stats.messagesTotal >= rule.threshold) qualified = true;
                    break;
                case 'VOICE':
                    if (stats.voiceMinutesTotal >= rule.threshold) qualified = true;
                    break;
                case 'REPUTATION':
                    if (stats.reputation >= rule.threshold) qualified = true;
                    break;
                case 'TENURE':
                    if (daysSinceJoin >= rule.threshold) qualified = true;
                    break;
            }

            if (qualified) {
                if (!member.roles.cache.has(rule.roleId)) {
                    try {
                        await member.roles.add(rule.roleId);
                        logger.info(`Awarded auto-role ${rule.roleId} to ${member.user.tag}`);
                    } catch (err) {
                        logger.error(`Failed to give role ${rule.roleId} to ${member.id}`, err);
                    }
                }
            }
        }
    }

    static async getStats(guildId: string, userId: string) {
        return await prisma.memberStats.findUnique({
            where: { guildId_userId: { guildId, userId } }
        });
    }

    // --- Weekly Reset / Achievements (Run via Cron or Command) ---
    static async processWeeklyReset(guildId: string, client: any) {
        // TODO: Implement advanced achievement logic
        // 1. Fetch AchievementConfigs
        // 2. Find top users for each type
        // 3. Award roles / Remove from old winners
        // 4. Reset weekly stats

        logger.info(`Running weekly reset for ${guildId}`);

        // Reset Logic
        await prisma.memberStats.updateMany({
            where: { guildId },
            data: {
                messagesWeekly: 0,
                voiceMinutesWeekly: 0
            }
        });
    }
}
