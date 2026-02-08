import { GuildConfig, GuildFeature } from '@prisma/client';
import { prisma } from '../db';
import { logger } from '../utils/logger';

type CacheEntry<T> = {
    data: T | null;
    expiresAt: number;
};

class GuildCacheService {
    private configCache = new Map<string, CacheEntry<GuildConfig>>();
    private featureCache = new Map<string, CacheEntry<GuildFeature>>();

    // 5 Minute TTL by default for reads
    private readonly TTL = 5 * 60 * 1000;

    /**
     * Get GuildConfig with caching
     */
    async getConfig(guildId: string): Promise<GuildConfig | null> {
        const cached = this.configCache.get(guildId);
        if (cached && Date.now() < cached.expiresAt) {
            return cached.data;
        }

        const data = await prisma.guildConfig.findUnique({ where: { guildId } });
        this.configCache.set(guildId, { data, expiresAt: Date.now() + this.TTL });
        return data;
    }

    /**
     * Update/Upsert GuildConfig and refresh cache
     */
    async saveConfig(guildId: string, data: Partial<GuildConfig>): Promise<GuildConfig> {
        const result = await prisma.guildConfig.upsert({
            where: { guildId },
            create: { guildId, ...data } as any, // Cast for partial fix flexibility
            update: data,
        });
        // Auto-refresh cache
        this.configCache.set(guildId, { data: result, expiresAt: Date.now() + this.TTL });
        return result;
    }

    /**
     * Get GuildFeature with caching (Key = guildId:featureKey)
     */
    async getFeature(guildId: string, featureKey: string): Promise<GuildFeature | null> {
        const key = `${guildId}:${featureKey}`;
        const cached = this.featureCache.get(key);
        if (cached && Date.now() < cached.expiresAt) {
            return cached.data;
        }

        const data = await prisma.guildFeature.findUnique({
            where: { guildId_featureKey: { guildId, featureKey } }
        });
        this.featureCache.set(key, { data, expiresAt: Date.now() + this.TTL });
        return data;
    }

    /**
     * Update/Upsert GuildFeature and refresh cache
     */
    async saveFeature(guildId: string, featureKey: string, data: Omit<GuildFeature, 'updatedAt' | 'guildId' | 'featureKey'>): Promise<GuildFeature> {
        const key = `${guildId}:${featureKey}`;

        const result = await prisma.guildFeature.upsert({
            where: { guildId_featureKey: { guildId, featureKey } },
            create: { guildId, featureKey, ...data },
            update: data,
        });

        this.featureCache.set(key, { data: result, expiresAt: Date.now() + this.TTL });
        return result;
    }

    /**
     * Invalidate cache for a guild manually if needed
     */
    invalidate(guildId: string) {
        this.configCache.delete(guildId);
        // Invalidate all features for this guild? 
        // Iterate or just let them expire. Simple iteration for safety:
        for (const key of this.featureCache.keys()) {
            if (key.startsWith(`${guildId}:`)) {
                this.featureCache.delete(key);
            }
        }
    }
}

export const guildCache = new GuildCacheService();
