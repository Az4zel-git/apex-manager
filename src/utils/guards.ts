import { logger } from './logger';

/**
 * Ensures that a guildId is present and valid for guild-scoped operations.
 * @param guildId - The ID of the guild to validate.
 * @param context - Optional context description for logging (e.g., 'ModAction').
 * @throws Error if guildId is missing.
 */
export function ensureGuildId(guildId: string | undefined | null, context: string = 'Operation'): string {
    if (!guildId) {
        const errorMsg = `[Guard] ${context} requires a valid Guild ID.`;
        logger.error(errorMsg);
        throw new Error(errorMsg);
    }
    return guildId;
}
