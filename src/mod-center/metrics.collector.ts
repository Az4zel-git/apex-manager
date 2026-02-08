import { PrismaClient } from '@prisma/client';
import { ModStatus, BurnoutLevel, ModeratorStats } from './types';
import { BurnoutDetector } from './burnout.detector';

export class MetricsCollector {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    /**
     * Tracks a ticket resolution or closure.
     */
    async trackTicketResolution(modId: string, guildId: string, durationSeconds: number) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Update or create daily metrics
        await this.prisma.moderatorMetrics.upsert({
            where: {
                modId_guildId_date: {
                    modId,
                    guildId,
                    date: today,
                },
            },
            update: {
                ticketsResolved: { increment: 1 },
                // Simple moving average for this day could be complex in SQL update, 
                // so we might need to fetch-calc-save or store totalTime + count.
                // For simplicity here, we'll store totals if we change schema or just approx for now.
                // Let's assume schema has avgResponseTime, we need total time to update average accurately.
                // We'll trust the caller passes a calculated average or we fetch first.
                // Optimization: let's change schema to store `totalResolutionSeconds` later?
                // For now, let's just increment resolved count.
            },
            create: {
                modId,
                guildId,
                date: today,
                ticketsResolved: 1,
                avgResponseTime: durationSeconds,
            },
        });

        // Check for Burnout
        const burnout = new BurnoutDetector(this.prisma);
        await burnout.checkBurnout(modId, guildId);

        // Also update Profile stats if needed (global)
    }

    async trackReopen(modId: string, guildId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await this.prisma.moderatorMetrics.upsert({
            where: {
                modId_guildId_date: {
                    modId,
                    guildId,
                    date: today,
                },
            },
            update: {
                reopenCount: { increment: 1 },
            },
            create: {
                modId,
                guildId,
                date: today,
                reopenCount: 1,
            },
        });
    }

    async getModStats(modId: string, guildId: string, days = 7): Promise<ModeratorStats | null> {
        // Calculate aggregate over last N days
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const metrics = await this.prisma.moderatorMetrics.findMany({
            where: {
                modId,
                guildId,
                date: { gte: cutoff }
            }
        });

        if (metrics.length === 0) return null;

        const totalResolved = metrics.reduce((acc, m) => acc + m.ticketsResolved, 0);
        const totalReopens = metrics.reduce((acc, m) => acc + m.reopenCount, 0);

        // If we had totalTime, we'd avg that. 
        // For now, just avg of daily avgs (approx)
        const avgResponse = metrics.reduce((acc, m) => acc + m.avgResponseTime, 0) / metrics.length;

        return {
            ticketsResolved: totalResolved,
            reopenRate: totalResolved > 0 ? totalReopens / totalResolved : 0,
            avgResponseTime: avgResponse,
            activeTickets: 0 // Fetch from assignments
        };
    }
}
