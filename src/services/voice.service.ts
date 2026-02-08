import { ChannelType, VoiceState, GuildMember, Channel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { prisma } from '../db';
import { logger } from '../utils/logger';

export class VoiceService {
    private static creationCooldowns = new Map<string, number>();

    static async handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
        const member = newState.member;
        if (!member) return;

        // Diagnostic Log with Bot Tag
        const botTag = newState.client.user?.tag || 'UnknownBot';
        // logger.debug(`[${botTag}] VS Update: ${member.user.tag} (${member.id})`);

        // Fetch generator channel ID from DB
        const config = await prisma.guildConfig.findUnique({ where: { guildId: member.guild.id } });
        const GENERATOR_CHANNEL_ID = config?.generatorChannelId;

        if (!GENERATOR_CHANNEL_ID) return;

        // 1. User Joined Generator Channel
        if (newState.channelId === GENERATOR_CHANNEL_ID && oldState.channelId !== GENERATOR_CHANNEL_ID) {

            // COOLDOWN CHECK - Fixes Double Channel Issue
            const now = Date.now();
            const lastCreation = this.creationCooldowns.get(member.id) || 0;
            if (now - lastCreation < 3000) { // 3 seconds debounce
                logger.warn(`[${botTag}] Ignored rapid channel creation request for ${member.user.tag}`);
                return;
            }

            // DB DUPLICATE CHECK
            const existing = await prisma.tempVoiceChannel.findFirst({ where: { ownerId: member.id } });
            if (existing) {
                const ch = member.guild.channels.cache.get(existing.channelId);
                if (ch) {
                    logger.warn(`[${botTag}] User ${member.user.tag} already has channel ${existing.channelId}. Aborting.`);
                    return;
                } else {
                    // Stale
                    await prisma.tempVoiceChannel.delete({ where: { channelId: existing.channelId } });
                }
            }

            this.creationCooldowns.set(member.id, now);

            logger.info(`[${botTag}] User ${member.user.tag} joined generator. Creating channel...`);
            await this.createTempChannel(member, newState);
        }

        // 2. User Left a Channel (Check for Cleanup)
        if (oldState.channelId && oldState.channelId !== newState.channelId) {
            if (oldState.channel) {
                await this.checkEmptyChannel(oldState.channel);
            }
        }
    }

    static async createTempChannel(member: GuildMember, state: VoiceState) {
        const guild = member.guild;
        const parentCategory = state.channel?.parent;

        try {
            const channelName = `${member.user.username}'s Room`;

            const newChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildVoice,
                parent: parentCategory?.id,
            });

            // Set Permissions
            try {
                // Member Perms
                await newChannel.permissionOverwrites.edit(member.id, {
                    MoveMembers: true,
                    Connect: true
                });
                // Bot Perms (Safeguard)
                await newChannel.permissionOverwrites.edit(guild.client.user!.id, {
                    ViewChannel: true,
                    Connect: true,
                    ManageChannels: true,
                    ManageRoles: true
                });
            } catch (e) {
                logger.error(`Failed to set permissions for ${newChannel.id}`, e);
            }

            // Move Member
            await member.voice.setChannel(newChannel);

            // DB Record
            await prisma.tempVoiceChannel.create({
                data: {
                    channelId: newChannel.id,
                    guildId: guild.id,
                    ownerId: member.id
                }
            });

            // Send Control Panel
            await this.sendControlPanel(newChannel);

        } catch (error) {
            logger.error('Error creating temp voice channel:', error);
        }
    }

    static async checkEmptyChannel(channel: Channel) {
        if (!channel.isVoiceBased()) return;

        // Check if DB record exists (is it a temp channel?)
        const dbChannel = await prisma.tempVoiceChannel.findUnique({
            where: { channelId: channel.id }
        });

        if (!dbChannel) return;

        // Fetch fresh to get accurate member count
        try {
            const freshChannel = await channel.guild.channels.fetch(channel.id);
            if (!freshChannel || !freshChannel.isVoiceBased()) return;

            if (freshChannel.members.size === 0) {
                await channel.delete();
                await prisma.tempVoiceChannel.delete({ where: { channelId: channel.id } });
                logger.info(`Deleted empty temp channel ${channel.id}`);
            }
        } catch (e) {
            // Channel likely already deleted
            // logger.error('Error checking empty channel', e); 
        }
    }

    static getControlPanelComponents() {
        // UI REWRITE: All Secondary (Grey), Standardized Layout
        const row1 = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder().setCustomId('vc_rename').setLabel('Edit').setEmoji('✏️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('vc_transfer').setLabel('Ownership').setEmoji('👑').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('vc_reset').setLabel('Reset').setEmoji('🔄').setStyle(ButtonStyle.Secondary)
            );

        const row2 = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder().setCustomId('vc_lock').setLabel('Lock').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('vc_unlock').setLabel('Unlock').setEmoji('🔓').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('vc_permit').setLabel('Permit').setEmoji('🙋').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('vc_block').setLabel('Block').setEmoji('⛔').setStyle(ButtonStyle.Secondary)
            );

        const row3 = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder().setCustomId('vc_kick').setLabel('Kick').setEmoji('👢').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('vc_ban').setLabel('Ban').setEmoji('⛔').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('vc_hide').setLabel('Hide').setEmoji('🚫').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('vc_show').setLabel('Show').setEmoji('🌐').setStyle(ButtonStyle.Secondary)
            );

        const row4 = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder().setCustomId('vc_info').setLabel('Info').setEmoji('📬').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('vc_bitrate').setLabel('Bitrate').setEmoji('📶').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('vc_limit').setLabel('Limit').setEmoji('🔢').setStyle(ButtonStyle.Secondary)
            );

        return [row1, row2, row3, row4];
    }

    static async sendControlPanel(channel: Channel) {
        if (!channel.isTextBased()) return; // Should be VoiceChannel but technically triggers use text sending

        const embed = new EmbedBuilder()
            .setTitle('VC- Manager')
            .setDescription('**Welcome to the VC-Manager interface**\nUse these buttons to manage your temporary voice channel.')
            .setColor('#2B2D31') // Discord Dark
            .addFields({ name: 'Owner', value: `<@${(channel as any).members?.first()?.id || 'Unknown'}>` });

        try {
            await (channel as any).send({ embeds: [embed], components: this.getControlPanelComponents() });
        } catch (error) {
            logger.error(`Failed to send control panel to ${channel.id}`, error);
        }
    }

    // --- Actions ---

    static async getOwner(channelId: string): Promise<string | null> {
        const dbChannel = await prisma.tempVoiceChannel.findUnique({ where: { channelId } });
        return dbChannel ? dbChannel.ownerId : null;
    }

    static async renameChannel(channel: Channel, name: string) {
        if (channel.isVoiceBased()) await channel.setName(name);
    }

    static async setLimit(channel: Channel, limit: number) {
        if (channel.isVoiceBased()) await channel.setUserLimit(limit);
    }

    static async setBitrate(channel: Channel, bitrate: number) {
        if (channel.isVoiceBased()) await channel.setBitrate(bitrate);
    }

    static async lockChannel(channel: Channel) {
        if (channel.isVoiceBased()) await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { Connect: false });
    }

    static async unlockChannel(channel: Channel) {
        if (channel.isVoiceBased()) await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { Connect: null });
    }

    static async hideChannel(channel: Channel) {
        if (channel.isVoiceBased()) await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { ViewChannel: false });
    }

    static async showChannel(channel: Channel) {
        if (channel.isVoiceBased()) await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { ViewChannel: null });
    }

    static async permitUser(channel: Channel, userId: string) {
        if (channel.isVoiceBased()) await channel.permissionOverwrites.edit(userId, { Connect: true });
    }

    static async blockUser(channel: Channel, userId: string) {
        if (channel.isVoiceBased()) await channel.permissionOverwrites.edit(userId, { Connect: false });
        // Note: Logic for 'vc_block' button was implied, treating same as Ban/Permit-False
    }

    static async kickUser(channel: Channel, userId: string) {
        if (!channel.isVoiceBased()) return;
        const member = channel.members.get(userId);
        if (member) await member.voice.disconnect();
    }

    static async banUser(channel: Channel, userId: string) {
        if (!channel.isVoiceBased()) return;
        await channel.permissionOverwrites.edit(userId, { Connect: false });
        const member = channel.members.get(userId);
        if (member) await member.voice.disconnect();
    }

    static async claimChannel(channel: Channel, newOwner: GuildMember) {
        await prisma.tempVoiceChannel.update({
            where: { channelId: channel.id },
            data: { ownerId: newOwner.id }
        });
    }

    static async resetPermissions(channel: Channel) {
        if (channel.isVoiceBased()) await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { Connect: null, ViewChannel: null });
    }
}
