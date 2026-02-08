import { ReputationScore, ModeratorStats, ModStatus } from './types';

export class ReputationEngine {

    /**
     * Calculates a fairness score (0-100) based on moderator metrics.
     * - Consistency: Low reopen rate
     * - Reliability: High resolution count (normalized)
     * - Responsiveness: Low response time
     */
    calculateReputation(stats: ModeratorStats): ReputationScore {
        // 1. Consistency: Reopen rate penalties
        // < 5% = 100, 5-10% = 80, > 20% = 0
        let consistency = 100 - (stats.reopenRate * 100 * 2);
        if (consistency < 0) consistency = 0;

        // 2. Responsiveness: Avg response time
        // < 5 min (300) = 100. > 1 hour (3600s) = 40.
        let responsiveness = 100;
        if (stats.avgResponseTime > 300) {
            responsiveness = Math.max(0, 100 - ((stats.avgResponseTime - 300) / 60)); // -1 pt per min over 5m
        }

        // 3. Reliability: (Placeholder)
        const reliability = 100;

        const total = (consistency * 0.4) + (responsiveness * 0.4) + (reliability * 0.2);

        return {
            total: Math.round(total),
            consistency,
            reliability,
            sustainability: 100, // TODO: Link to Burnout
            responsiveness,
        };
    }

    normalizeScores(allScores: number[]): number[] {
        // Enhance: Bell curve normalization if needed
        return allScores;
    }
}
