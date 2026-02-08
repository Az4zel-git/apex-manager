import { PrismaClient } from '@prisma/client';

export class AuditLogger {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    async logAction(guildId: string, actorId: string, action: string, targetId?: string, details?: any) {
        await this.prisma.modAuditLog.create({
            data: {
                guildId,
                actorId,
                action,
                targetId,
                details: details ? JSON.stringify(details) : undefined,
            },
        });
    }

    async getLogs(guildId: string, limit = 50, offset = 0) {
        return this.prisma.modAuditLog.findMany({
            where: { guildId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
    }
}
