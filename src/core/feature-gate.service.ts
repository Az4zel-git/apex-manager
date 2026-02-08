import { guildCache } from '../services/guild-cache.service';
import { logger } from '../utils/logger';
import { safeJsonParse } from '../utils/json';

export class FeatureGateService {
    /**
     * Checks if a specific feature is enabled for a guild.
     * @param guildId - The Guild ID
     * @param featureKey - The feature key (e.g., 'server_stats', 'tickets')
     * @returns boolean
     */
    static async isEnabled(guildId: string, featureKey: string): Promise<boolean> {
        try {
            const feature = await guildCache.getFeature(guildId, featureKey);
            if (!feature) return false;

            // Should also check if feature.enabled is true directly on the model if it exists
            if (feature.enabled === false) return false;

            // Double check config content if necessary, though 'enabled' column is primary
            const config = safeJsonParse(feature.config, { enabled: false }, 'FeatureGate');
            return !!config.enabled;
        } catch (error) {
            logger.error(`[FeatureGate] Error checking ${featureKey} for ${guildId}:`, error);
            // Default to safe closed state
            return false;
        }
    }

    /**
     * Checks if the guild has access to a premium feature.
     * Currently just returns true, but implementation is ready for entitlement checks.
     */
    static async hasEntitlement(guildId: string, entitlement: string): Promise<boolean> {
        // Place entitlement logic here (db check, external API, etc.)
        return true;
    }
}
