import { Client, GuildMember, TextChannel, EmbedBuilder, Colors } from 'discord.js';
import { guildCache } from './guild-cache.service';
import { logger } from '../utils/logger';
import { safeJsonParse } from '../utils/json';

const KEY = 'welcome';

export interface WelcomeConfig {
    enabled: boolean;
    channelId?: string;
    mentionUser: boolean;
    titleTemplate: string;
    descriptionTemplate: string;
    embedColor: string; // Hex
    footerText?: string;
    showThumbnail: boolean; // User avatar
    bannerImageUrl?: string;
    fields: string[]; // ['username', 'id', 'created', 'joined', 'member_count']
    autoDelete: boolean;
    deleteAfterSeconds: number;
}

export class WelcomeService {

    // Raid Protection: GuildID -> Timestamp[] of joins
    private static joinTimes = new Map<string, number[]>();

    static async handleMemberJoin(member: GuildMember) {
        if (member.user.bot) return;

        const config = await this.getConfig(member.guild.id);
        if (!config || !config.enabled || !config.channelId) return;

        // Raid Protection
        if (this.isRaid(member.guild.id)) {
            logger.warn(`[Welcome] Raid detected in ${member.guild.id}. Skipping welcome.`);
            return;
        }

        const channel = member.guild.channels.cache.get(config.channelId);
        if (!channel || !channel.isTextBased()) return;

        try {
            const embed = this.buildEmbed(member, config);
            const content = config.mentionUser ? `👋 ${member.toString()}` : undefined;

            const message = await (channel as TextChannel).send({ content, embeds: [embed] });

            if (config.autoDelete && config.deleteAfterSeconds > 0) {
                setTimeout(() => {
                    message.delete().catch(() => { });
                }, config.deleteAfterSeconds * 1000);
            }
        } catch (error) {
            logger.error(`[Welcome] Failed to send welcome in ${member.guild.id}`, error);
        }
    }

    private static isRaid(guildId: string): boolean {
        const now = Date.now();
        const times = this.joinTimes.get(guildId) || [];

        // Filter joins in last 10 seconds
        const recent = times.filter(t => now - t < 10000);
        recent.push(now);

        this.joinTimes.set(guildId, recent);

        // Limit: > 10 joins in 10 seconds = Raid
        return recent.length > 10;
    }

    private static buildEmbed(member: GuildMember, config: WelcomeConfig): EmbedBuilder {
        const title = this.formatText(config.titleTemplate || 'Welcome to {server}!', member);
        const desc = this.formatText(config.descriptionTemplate || 'Welcome {user}, enjoy your stay!', member);
        const footer = config.footerText ? this.formatText(config.footerText, member) : undefined;

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(desc)
            .setColor((config.embedColor as any) || Colors.Blue)
            .setTimestamp();

        if (footer) embed.setFooter({ text: footer });
        if (config.showThumbnail) embed.setThumbnail(member.user.displayAvatarURL({ forceStatic: false }));
        if (config.bannerImageUrl) embed.setImage(config.bannerImageUrl);

        if (config.fields && config.fields.length > 0) {
            if (config.fields.includes('username')) embed.addFields({ name: 'User', value: member.user.tag, inline: true });
            if (config.fields.includes('id')) embed.addFields({ name: 'ID', value: member.id, inline: true });
            if (config.fields.includes('created')) embed.addFields({ name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true });
            if (config.fields.includes('joined')) embed.addFields({ name: 'Joined Server', value: `<t:${Math.floor((member.joinedTimestamp || Date.now()) / 1000)}:R>`, inline: true });
            if (config.fields.includes('member_count')) embed.addFields({ name: 'Member #', value: `${member.guild.memberCount}`, inline: true });
        }

        return embed;
    }

    private static formatText(template: string, member: GuildMember): string {
        return template
            .replace(/{user}/g, member.toString())
            .replace(/{username}/g, member.user.username)
            .replace(/{userId}/g, member.id)
            .replace(/{server}/g, member.guild.name)
            .replace(/{memberCount}/g, member.guild.memberCount.toString());
    }

    private static async getConfig(guildId: string): Promise<WelcomeConfig | null> {
        const feature = await guildCache.getFeature(guildId, KEY);
        if (!feature) return null;

        const defaults: WelcomeConfig = {
            enabled: false,
            mentionUser: true,
            titleTemplate: 'Welcome to {server}!',
            descriptionTemplate: 'Welcome {user}!',
            embedColor: '#5865F2',
            showThumbnail: true,
            fields: ['created', 'member_count'],
            autoDelete: false,
            deleteAfterSeconds: 60
        };

        return safeJsonParse(feature.config, defaults, 'WelcomeConfig');
    }
}
