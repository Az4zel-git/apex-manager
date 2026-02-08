import { PrismaClient } from '@prisma/client';
import { BurnoutLevel, ModStatus } from './types';

export class BurnoutDetector {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    async checkBurnout(modId: string, guildId: string): Promise<BurnoutLevel> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const metrics = await this.prisma.moderatorMetrics.findUnique({
            where: {
                modId_guildId_date: { modId, guildId, date: today }
            }
        });

        if (!metrics) return BurnoutLevel.LOW;

        // Thresholds (could be dynamic from ModSettings)
        const MAX_TICKETS_DAILY = 15;
        const MAX_RESPONSE_TIME_SPIKE = 600; // 10 mins

        let score = 0;
        if (metrics.ticketsResolved > MAX_TICKETS_DAILY) score += 50;
        if (metrics.avgResponseTime > MAX_RESPONSE_TIME_SPIKE) score += 30;
        if (metrics.reopenCount > 2) score += 20;

        // Update profile score
        await this.prisma.moderatorProfile.update({
            where: { guildId_userId: { guildId, userId: modId } },
            data: { burnoutScore: score }
        });

        if (score > 70) return BurnoutLevel.HIGH;
        if (score > 30) return BurnoutLevel.MEDIUM;
        return BurnoutLevel.LOW;
    }
}
