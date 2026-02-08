import { Client, Guild, ChannelType, PermissionFlagsBits, CategoryChannel } from 'discord.js';
import { logger } from '../utils/logger';
import { guildCache } from './guild-cache.service';
import { safeJsonParse } from '../utils/json';

const KEY = 'server_stats';

// CONFIG consts
const ONLINE_DEBOUNCE_MS = 6000;
const ONLINE_MIN_INTERVAL_MS = 30000;
const BACKGROUND_INTERVAL_MS = 120000; // 2 minutes
const FULL_SYNC_INTERVAL_MS = 600000; // 10 minutes

interface StatsConfig {
    enabled: boolean;
    channelType: 'voice' | 'text';
    stats: string[];
    categoryId?: string;
    channelIds?: Record<string, string>;
}

export class ServerStatsService {
    // Schedulers
    private static onlineDebounceMap = new Map<string, NodeJS.Timeout>();
    private static lastOnlineUpdateMap = new Map<string, number>();

    static async init(client: Client) {
        logger.info('Initializing Dual-Rate ServerStatsService...');

        // 1. Initial Full Sync (on startup)
        client.guilds.cache.forEach(guild => {
            this.triggerBackgroundUpdate(client, guild.id);
            this.triggerOnlineUpdate(client, guild.id);
        });

        // 2. Background Scheduler (2 Minutes) - For non-online stats
        setInterval(() => {
            client.guilds.cache.forEach(guild => {
                this.triggerBackgroundUpdate(client, guild.id);
            });
        }, BACKGROUND_INTERVAL_MS);

        // 3. Full Sync Scheduler (10 Minutes) - Drift correction
        setInterval(() => {
            client.guilds.cache.forEach(guild => {
                this.triggerBackgroundUpdate(client, guild.id);
                this.triggerOnlineUpdate(client, guild.id, true); // Force update
            });
        }, FULL_SYNC_INTERVAL_MS);
    }

    /**
     * Fast Path: Called by Presence/Member events.
     * Debounced to prevent rate limits.
     */
    static async triggerOnlineUpdate(client: Client, guildId: string, force = false) {
        // Clear existing debounce
        if (this.onlineDebounceMap.has(guildId)) {
            clearTimeout(this.onlineDebounceMap.get(guildId)!);
        }

        const now = Date.now();
        const lastRun = this.lastOnlineUpdateMap.get(guildId) || 0;
        const timeSince = now - lastRun;

        // Rate Limit Guard: If we updated recently (and not forced), skip immediate execution
        if (!force && timeSince < ONLINE_MIN_INTERVAL_MS) {
            // Schedule it for later instead of running now
            const delay = ONLINE_MIN_INTERVAL_MS - timeSince + 1000;
            const timeout = setTimeout(() => this.performOnlineUpdate(client, guildId), delay);
            this.onlineDebounceMap.set(guildId, timeout);
            return;
        }

        // Schedule execution with Debounce
        const timeout = setTimeout(() => this.performOnlineUpdate(client, guildId), ONLINE_DEBOUNCE_MS);
        this.onlineDebounceMap.set(guildId, timeout);
    }

    /**
     * Slow Path: Called by Interval.
     */
    static async triggerBackgroundUpdate(client: Client, guildId: string) {
        // No debounce needed, driven by interval
        await this.performBackgroundUpdate(client, guildId);
    }

    // =========================================
    // UPDATE LOGIC
    // =========================================

    private static async performOnlineUpdate(client: Client, guildId: string) {
        this.lastOnlineUpdateMap.set(guildId, Date.now());
        const config = await this.getConfig(guildId);
        if (!config || !config.enabled) return;

        // Only proceed if 'online' stat is enabled
        if (!config.stats.includes('online')) return;

        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) return;

        await this.updateChannelName(guild, config, 'online');
    }

    private static async performBackgroundUpdate(client: Client, guildId: string) {
        const config = await this.getConfig(guildId);
        if (!config) return;

        if (!config.enabled) {
            // If disabled, maybe ensure cleanup? (handled typically by toggle command, but good safety)
            return;
        }

        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) return;

        // Ensure Setup (Category/Channels)
        await this.ensureStructure(guild, config);

        // Update all stats EXCEPT 'online' (handled by fast path, though refreshing it here doesn't hurt, we skip to save API calls)
        for (const stat of config.stats) {
            if (stat === 'online') continue;
            await this.updateChannelName(guild, config, stat);
        }

        // Clean up removed stats
        await this.cleanupUnusedChannels(guild, config);

        // Save config in case channel IDs changed during structure ensure
        await this.saveConfig(guildId, config);
    }

    // =========================================
    // CORE HELPERS
    // =========================================

    private static async getConfig(guildId: string): Promise<StatsConfig | null> {
        const feature = await guildCache.getFeature(guildId, KEY);
        if (!feature) return null;
        return safeJsonParse(feature.config, {
            enabled: false,
            channelType: 'voice',
            stats: []
        } as StatsConfig, 'StatsConfig');
    }

    private static async ensureStructure(guild: Guild, config: StatsConfig) {
        let categoryId = config.categoryId;
        let category: CategoryChannel | undefined;

        if (categoryId && categoryId !== 'NEW') {
            category = guild.channels.cache.get(categoryId) as CategoryChannel;
        }

        if (!category) {
            category = await guild.channels.create({
                name: '📊 Server Statistics',
                type: ChannelType.GuildCategory,
                position: 0,
                permissionOverwrites: [{ id: guild.id, deny: [PermissionFlagsBits.Connect], allow: [PermissionFlagsBits.ViewChannel] }]
            });
            config.categoryId = category.id;
        }

        // Force to top
        if (category.position !== 0) {
            await category.setPosition(0).catch(() => { });
        }
    }

    private static async updateChannelName(guild: Guild, config: StatsConfig, stat: string) {
        const categoryId = config.categoryId;
        if (!categoryId) return;

        if (!config.channelIds) config.channelIds = {};

        const newValueName = await this.getStatValueName(guild, stat);
        const existingId = config.channelIds[stat];

        let channel = existingId ? guild.channels.cache.get(existingId) : undefined;

        // Create if missing
        if (!channel) {
            channel = await guild.channels.create({
                name: newValueName,
                type: config.channelType === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText,
                parent: categoryId,
                permissionOverwrites: [{ id: guild.id, deny: [PermissionFlagsBits.Connect], allow: [PermissionFlagsBits.ViewChannel] }]
            });
            config.channelIds[stat] = channel.id;
            // Save immediately when creating new channel to avoid ID loss
            await this.saveConfig(guild.id, config);
            return;
        }

        // Update Name ONLY if changed
        if (channel.name !== newValueName) {
            try {
                await channel.setName(newValueName);
            } catch (error) {
                // Ignore rate limits, log others
                if ((error as any).code !== 50013) { // Missing Permissions
                    logger.debug(`Skipped stats update for ${stat} in ${guild.id}: ${(error as any).message}`);
                }
            }
        }
    }

    private static async getStatValueName(guild: Guild, stat: string): Promise<string> {
        switch (stat) {
            case 'members': return `👥 Members: ${guild.memberCount}`;
            case 'online':
                const online = await this.countOnline(guild);
                return `🟢 Online: ${online}`;
            case 'staff_online':
                return `🛡️ Staff Online: ${await this.countStaffOnline(guild)}`;
            case 'admins': return `🛡️ Admins Online: ${await this.countRoles(guild, 'admin')}`;
            case 'mods': return `👮 Mods Online: ${await this.countRoles(guild, 'mod')}`;
            case 'bots': return `🤖 Bots: ${guild.members.cache.filter(m => m.user.bot).size}`;
            default: return stat;
        }
    }

    private static async cleanupUnusedChannels(guild: Guild, config: StatsConfig) {
        if (!config.channelIds) return;
        const currentStats = config.stats;

        for (const [key, id] of Object.entries(config.channelIds)) {
            if (!currentStats.includes(key)) {
                const channel = guild.channels.cache.get(id);
                if (channel) await channel.delete().catch(() => { });
                delete config.channelIds[key];
            }
        }
    }

    private static async countOnline(guild: Guild) {
        // Force fetch presences if possible, though cache is preferred for speed
        if (guild.memberCount > guild.members.cache.size) {
            await guild.members.fetch({ withPresences: true }).catch(() => { });
        }
        return guild.members.cache.filter(m => !m.user.bot && (m.presence?.status === 'online' || m.presence?.status === 'idle' || m.presence?.status === 'dnd')).size;
    }

    private static async countStaffOnline(guild: Guild): Promise<number> {
        try {
            const config = await guildCache.getConfig(guild.id);
            if (!config) return 0;

            const adminRoles: string[] = safeJsonParse(config.adminRoles, [], 'AdminRoles');
            const modRoles: string[] = safeJsonParse(config.modRoles, [], 'ModRoles');
            const staffRoleIds = [...new Set([...adminRoles, ...modRoles])];

            if (!staffRoleIds.length) return 0;

            const onlineStaff = guild.members.cache.filter(m =>
                m.presence?.status !== 'offline' && m.presence?.status !== undefined &&
                m.roles.cache.some(r => staffRoleIds.includes(r.id))
            );
            return onlineStaff.size;
        } catch (error) { return 0; }
    }

    private static async countRoles(guild: any, roleType: 'admin' | 'mod'): Promise<number> {
        try {
            const config = await guildCache.getConfig(guild.id);
            if (!config) return 0;
            const rolesJson = roleType === 'admin' ? config.adminRoles : config.modRoles;
            const roleIds: string[] = safeJsonParse(rolesJson, [], 'RoleCount');
            if (!roleIds.length) return 0;

            return guild.members.cache.filter((m: any) =>
                m.presence?.status !== 'offline' && m.presence?.status !== undefined &&
                m.roles.cache.some((r: any) => roleIds.includes(r.id))
            ).size;
        } catch (error) { return 0; }
    }

    private static async saveConfig(guildId: string, config: StatsConfig) {
        await guildCache.saveFeature(guildId, KEY, {
            config: JSON.stringify(config),
            enabled: config.enabled
        });
    }
}
