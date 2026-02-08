import { PrismaClient } from '@prisma/client';
import { ModStatus, BurnoutLevel } from './types';
import { ReputationEngine } from './reputation.engine';

export class AssignmentEngine {
    private prisma: PrismaClient;
    private reputationEngine: ReputationEngine;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
        this.reputationEngine = new ReputationEngine();
    }

    async findBestModerator(guildId: string, categoryId?: string): Promise<string | null> {
        // 1. Get functional candidates (Active, Not Opted Out)
        const candidates = await this.prisma.moderatorProfile.findMany({
            where: {
                guildId,
                status: ModStatus.ACTIVE,
                optedOut: false,
                // Optional: filter by category expertise if we had that
            },
            include: {
                assignments: {
                    where: { unassignedAt: null } // Active assignments
                }
            }
        });

        if (candidates.length === 0) return null;

        // 2. Filter out Burnout / Overload
        const eligible = candidates.filter(c => {
            return c.burnoutScore < 70; // High burnout cutoff
        });

        if (eligible.length === 0) return candidates[0].userId; // Fallback to anyone if all burned out? Or null.

        // 3. Score candidates
        // Score = (Reputation * 0.3) - (ActiveTickets * 10) + (Random * 5)
        // We want LOW load, HIGH reputation.

        let bestModId = eligible[0].userId;
        let bestScore = -Infinity;

        for (const mod of eligible) {
            const load = mod.assignments.length;
            const score = (100 - (load * 20)); // Simple load balancing for now. 
            // TODO: Fetch reputation from cache or DB to weight this.

            if (score > bestScore) {
                bestScore = score;
                bestModId = mod.userId;
            }
        }

        return bestModId;
    }

    async assignTicket(ticketId: number, modId: string, guildId: string) {
        await this.prisma.$transaction([
            this.prisma.ticket.update({
                where: { id: ticketId },
                data: { claimedBy: modId, status: 'CLAIMED' }
            }),
            this.prisma.ticketAssignment.create({
                data: {
                    ticketId,
                    modId,
                    guildId,
                    reason: 'AUTO'
                }
            })
        ]);
    }
}
