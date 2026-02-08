import { ChannelType, Guild, GuildMember, PermissionFlagsBits, TextChannel, EmbedBuilder } from 'discord.js';
import { prisma } from '../db';
import { logger } from '../utils/logger';
import { MetricsCollector } from '../mod-center/metrics.collector';
import { TicketStatus, TicketAction, TicketColors } from './utils';
import { AssignmentEngine } from '../mod-center/assignment.engine';
import { ModStatus } from '../mod-center/types';

export class TicketService {

    static async createTicket(guild: Guild, member: GuildMember, categoryId: string, subject: string, description: string) {
        // 1. Fetch Config
        const config = await prisma.ticketConfig.findUnique({ where: { guildId: guild.id } });
        if (!config || !config.supportRoleId) {
            throw new Error('Ticket system not configured for this guild.');
        }

        // 2. Create Channel
        const ticketName = `${categoryId}-${member.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '').substring(0, 32);

        let parentId = config.categoryId;
        if (!parentId) {
            // Fallback: Check if we have a category named 'Tickets' or create one?
            // For now, let it be null (top level) or error.
            // Better: Let's assume the user sets it up via /ticket config.
        }

        const channel = await guild.channels.create({
            name: ticketName,
            type: ChannelType.GuildText,
            parent: parentId || undefined,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel] // Deny Everyone
                },
                {
                    id: member.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles]
                },
                {
                    id: config.supportRoleId,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages]
                },
                {
                    id: guild.client.user!.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
                }
            ]
        });

        // 3. Create DB Record
        const ticket = await prisma.ticket.create({
            data: {
                guildId: guild.id,
                channelId: channel.id,
                ownerId: member.id,
                categoryId: categoryId,
                status: TicketStatus.OPEN,
                subject: subject,
                description: description,
                events: {
                    create: {
                        actorId: member.id,
                        action: TicketAction.CREATED
                    }
                }
            }
        });


        // Auto-Assignment Removed by User Request (Manual Claim Only)

        return { ticket, channel };
    }

    static async getTicketByChannel(channelId: string) {
        return prisma.ticket.findFirst({
            where: { channelId }
        });
    }

    static async getOpenTicketByUser(userId: string, guildId: string) {
        return prisma.ticket.findFirst({
            where: {
                ownerId: userId,
                guildId: guildId,
                OR: [
                    { status: TicketStatus.OPEN },
                    { status: TicketStatus.CLAIMED }
                ]
            }
        });
    }

    static async claimTicket(ticketId: number, claimerId: string, channel: TextChannel) {
        // 1. Update DB
        const ticket = await prisma.ticket.update({
            where: { id: ticketId },
            data: {
                status: TicketStatus.CLAIMED,
                claimedBy: claimerId,
                events: {
                    create: {
                        actorId: claimerId,
                        action: TicketAction.CLAIMED
                    }
                }
            }
        });

        // 2. Update Channel Permissions
        // We want to keep original owner + claimer + bot.
        // Option A: Just add the claimer explictly (if they didn't have access via role)
        // Option B: Remove the support role to reduce noise? Usually claiming means "I got this".
        // Let's go with B: Add claimer, remove support role (optional, but requested often).
        // Actually, safer to just ADD the claimer as an explicit overwrite and maybe mention it.

        await channel.permissionOverwrites.edit(claimerId, {
            ViewChannel: true,
            SendMessages: true,
            ManageMessages: true
        });

        // Optional: Rename channel to indicate claimed? e.g. 'claimed-username'
        // await channel.setName(`claimed-${ticket.ownerId}`);

        return ticket;
    }

    static async closeTicket(ticketId: number, closedByUserId: string) {
        const ticket = await prisma.ticket.update({
            where: { id: ticketId },
            data: {
                status: TicketStatus.CLOSED,
                closedAt: new Date(),
                events: {
                    create: {
                        actorId: closedByUserId,
                        action: TicketAction.CLOSED
                    }
                }
            }
        });

        // Track Metrics
        try {
            const collector = new MetricsCollector(prisma);
            const duration = Math.floor((new Date().getTime() - ticket.createdAt.getTime()) / 1000);
            await collector.trackTicketResolution(closedByUserId, ticket.guildId, duration);
        } catch (error) {
            logger.error('Error tracking metrics:', error);
        }

        return ticket;
    }
}
