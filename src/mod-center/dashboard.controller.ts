import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ChatInputCommandInteraction, Client, EmbedBuilder, StringSelectMenuInteraction, TextChannel } from 'discord.js';
import { PrismaClient } from '@prisma/client'; // Adjust as needed for your singleton
import { DashboardUI } from './dashboard.ui';
import { PermissionsGuard } from './permissions.guard';
import { AuditLogger } from './audit.logger';
import { logger } from '../utils/logger';

export class DashboardController {
    private prisma: PrismaClient;
    private auditLogger: AuditLogger;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
        this.auditLogger = new AuditLogger(prisma);
    }

    async showDashboard(interaction: ChatInputCommandInteraction | ButtonInteraction) {
        // 1. Fetch Metrics
        const ticketCount = await this.prisma.ticket.count({
            where: {
                OR: [
                    { status: 'OPEN' },
                    { status: 'CLAIMED' }
                ]
            }
        });

        // Calculate Mods Online
        let modsOnline = 0;
        if (interaction.guild) {
            const modProfiles = await this.prisma.moderatorProfile.findMany({
                where: { guildId: interaction.guildId || undefined, status: { not: 'OFFLINE' } }
            });
            const modIds = new Set(modProfiles.map(m => m.userId));

            // We need to fetch/check presences. 
            // Note: Presences require the GUILD_PRESENCES intent.
            interaction.guild.members.cache.forEach(member => {
                if (modIds.has(member.id)) {
                    if (member.presence && member.presence.status !== 'offline') {
                        modsOnline++;
                    }
                }
            });
        }

        const avgWaitTime = 0; // TODO: Fetch from Metrics

        const snapshot = {
            activeTickets: ticketCount,
            modsOnline,
            burnoutRisk: 'Low',
            avgWaitTime
        };

        const embed = DashboardUI.getMainEmbed(snapshot);
        const controls = DashboardUI.getMainControls();

        if (interaction.isRepliable()) { // Type guard check
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [embed], components: [controls] });
            } else {
                await interaction.reply({ embeds: [embed], components: [controls], ephemeral: true });
            }
        }
    }

    async handleInteraction(interaction: ButtonInteraction | StringSelectMenuInteraction | any) {
        logger.info(`[DashboardController] Handling ${interaction.customId}`);
        if (!interaction.customId.startsWith('mod_')) return;

        try {
            if (interaction.customId === 'mod_btn_refresh') {
                await interaction.deferUpdate();
                await this.showDashboard(interaction);
                return;
            }

            if (interaction.customId === 'mod_btn_quit') {
                try {
                    await interaction.update({ content: '✅ Mod Dashboard closed.', embeds: [], components: [] });
                } catch (e) {
                    await interaction.deleteReply().catch(() => { });
                }
                return;
            }

            if (interaction.customId === 'mod_btn_tickets') {
                await interaction.deferUpdate();
                const tickets = await this.prisma.ticket.findMany({
                    where: {
                        OR: [
                            { status: 'OPEN' },
                            { status: 'CLAIMED' }
                        ]
                    },
                    take: 10
                });

                const enrichedTickets = await Promise.all(tickets.map(async t => {
                    let channelName = `ticket-${t.id}`;
                    if (t.channelId && interaction.guild) {
                        const channel = interaction.guild.channels.cache.get(t.channelId) || await interaction.guild.channels.fetch(t.channelId).catch(() => null);
                        if (channel) channelName = channel.name;
                    }
                    return { ...t, channelName };
                }));

                await interaction.editReply({
                    embeds: [DashboardUI.getTicketListEmbed(enrichedTickets)],
                    components: [DashboardUI.getBackControl()]
                });
                return;
            }

            if (interaction.customId === 'mod_btn_mods') {
                await interaction.deferUpdate();
                const mods = await this.prisma.moderatorProfile.findMany({ take: 10 });
                const enrichedMods = mods.map(m => ({ username: `<@${m.userId}>`, ...m }));
                await interaction.editReply({
                    embeds: [DashboardUI.getModListEmbed(enrichedMods)],
                    components: [DashboardUI.getModControls()]
                });
                return;
            }

            // --- Add Mod Flow ---
            if (interaction.customId === 'mod_btn_add_mod') {
                await interaction.reply({
                    content: 'Select users or roles to add as moderators:',
                    components: DashboardUI.getAddModMenu() as any,
                    ephemeral: true
                });
                return;
            }

            if (interaction.customId === 'mod_sel_add_user') {
                await interaction.deferUpdate();
                const userIds = interaction.values;
                let addedCount = 0;

                for (const userId of userIds) {
                    const existing = await this.prisma.moderatorProfile.findUnique({
                        where: {
                            guildId_userId: { guildId: interaction.guildId, userId }
                        }
                    });
                    if (!existing) {
                        await this.prisma.moderatorProfile.create({
                            data: { userId, guildId: interaction.guildId || 'unknown', status: 'ACTIVE' }
                        });
                        addedCount++;
                    }
                }

                await interaction.editReply({ content: `✅ Added ${addedCount} new moderator(s).`, components: [] });
                return;
            }

            if (interaction.customId === 'mod_sel_add_role') {
                await interaction.deferUpdate();
                const roleIds = interaction.values;
                let addedCount = 0;

                if (!interaction.guild) return;

                logger.info(`[ModCenter] Processing bulk role add. Roles: ${roleIds.join(', ')}`);

                for (const roleId of roleIds) {
                    try {
                        const role = await interaction.guild.roles.fetch(roleId);
                        if (!role) {
                            logger.warn(`[ModCenter] Role ${roleId} not found.`);
                            continue;
                        }

                        // Force fetch all members to populate role.members
                        await interaction.guild.members.fetch();
                        const members = role.members;

                        logger.info(`[ModCenter] Role ${role.name} has ${members.size} members.`);

                        for (const [memberId, member] of members) {
                            if (member.user.bot) continue;

                            const existing = await this.prisma.moderatorProfile.findUnique({
                                where: {
                                    guildId_userId: { guildId: interaction.guildId, userId: memberId }
                                }
                            });

                            if (!existing) {
                                await this.prisma.moderatorProfile.create({
                                    data: { userId: memberId, guildId: interaction.guildId || 'unknown', status: 'ACTIVE' }
                                });
                                addedCount++;
                                logger.info(`[ModCenter] Added ${member.user.tag} (${memberId}) from role.`);
                            }
                        }
                    } catch (err) {
                        logger.error(`[ModCenter] Error processing role ${roleId}:`, err);
                    }
                }

                await interaction.editReply({ content: `✅ Bulk added ${addedCount} moderators from selected roles.`, components: [] });
                return;
            }

            // --- Remove Mod Flow ---
            if (interaction.customId === 'mod_btn_remove_mod') {
                await interaction.deferReply({ ephemeral: true });
                // We should technically filter by guildId here too
                const mods = await this.prisma.moderatorProfile.findMany({
                    where: { guildId: interaction.guildId },
                    take: 25
                });

                if (mods.length === 0) {
                    await interaction.editReply({ content: 'No moderators to remove.' });
                    return;
                }

                // Resolve usernames for the menu labels
                const options = [];
                for (const mod of mods) {
                    let label = mod.userId;
                    try {
                        const member = await interaction.guild?.members.fetch(mod.userId);
                        if (member) label = member.user.username;
                    } catch (e) { /* ignore */ }

                    options.push({ ...mod, username: label });
                }

                const menu = DashboardUI.getRemoveModMenu(options);
                if (!menu) {
                    await interaction.editReply({ content: 'Error creating menu.' });
                    return;
                }

                await interaction.editReply({
                    content: 'Select a moderator to remove:',
                    components: [menu]
                });
                return;
            }

            if (interaction.customId === 'mod_sel_remove_user') {
                await interaction.deferUpdate();
                const userId = interaction.values[0];
                const guildId = interaction.guildId || 'unknown';

                logger.info(`[ModCenter] Attempting to remove mod ${userId} from guild ${guildId}`);

                try {
                    // Manually delete related records first to avoid FK issues if cascade is missing in DB
                    await this.prisma.moderatorMetrics.deleteMany({
                        where: { guildId: guildId, modId: userId }
                    });
                    await this.prisma.ticketAssignment.deleteMany({
                        where: { guildId: guildId, modId: userId }
                    });

                    await this.prisma.moderatorProfile.delete({
                        where: {
                            guildId_userId: {
                                guildId: guildId,
                                userId: userId
                            }
                        }
                    });
                    await interaction.editReply({ content: `🗑️ Removed <@${userId}> from moderators.`, components: [] });
                } catch (err: any) { // Type as any for error checking
                    logger.error(`[ModCenter] Failed to remove mod ${userId}:`, err);
                    if (err.code === 'P2025') { // Prisma record not found code
                        await interaction.editReply({ content: `⚠️ Could not find that moderator to remove. They may have already been removed.`, components: [] });
                    } else {
                        await interaction.editReply({ content: `❌ Error removing moderator: ${err.message}`, components: [] });
                    }
                }
                return;
            }


            if (interaction.customId === 'mod_btn_audit') {
                await interaction.deferUpdate();
                const logs = await this.prisma.modAuditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 });
                await interaction.editReply({
                    embeds: [DashboardUI.getAuditLogEmbed(logs)],
                    components: [DashboardUI.getBackControl()]
                });
                return;
            }

            if (interaction.customId === 'mod_btn_back') {
                await interaction.deferUpdate();
                await this.showDashboard(interaction);
                return;
            }

        } catch (error) {
            logger.error(`[DashboardController] Error processing ${interaction.customId}:`, error);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: 'An error occurred.', ephemeral: true });
                } else {
                    await interaction.followUp({ content: 'An error occurred.', ephemeral: true });
                }
            } catch (e) {
                // ignore double reply errors in catch block
            }
        }
    }
}
