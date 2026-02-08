import { prisma } from '../db';
import { TicketPanel, TicketPanelButton, Prisma } from '@prisma/client';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ColorResolvable } from 'discord.js';

export class TicketPanelService {

    static async createPanel(guildId: string, name: string) {
        return prisma.ticketPanel.create({
            data: {
                guildId,
                name
            }
        });
    }

    static async getPanelByName(guildId: string, name: string) {
        return prisma.ticketPanel.findUnique({
            where: {
                guildId_name: { guildId, name }
            },
            include: {
                buttons: {
                    orderBy: { order: 'asc' }
                }
            }
        });
    }

    static async getPanelById(id: string) {
        return prisma.ticketPanel.findUnique({
            where: { id },
            include: {
                buttons: {
                    orderBy: { order: 'asc' }
                }
            }
        });
    }

    static async updatePanel(guildId: string, name: string, data: Prisma.TicketPanelUpdateInput) {
        return prisma.ticketPanel.update({
            where: {
                guildId_name: { guildId, name }
            },
            data
        });
    }

    static async updatePanelId(id: string, data: Prisma.TicketPanelUpdateInput) {
        return prisma.ticketPanel.update({
            where: { id },
            data
        });
    }

    static async deletePanel(guildId: string, name: string) {
        return prisma.ticketPanel.delete({
            where: {
                guildId_name: { guildId, name }
            }
        });
    }

    static async addButton(guildId: string, panelName: string, data: { label: string, style: string, customId: string, emoji?: string }) {
        const panel = await this.getPanelByName(guildId, panelName);
        if (!panel) throw new Error("Panel not found");

        const lastButton = await prisma.ticketPanelButton.findFirst({
            where: { panelId: panel.id },
            orderBy: { order: 'desc' }
        });
        const order = lastButton ? lastButton.order + 1 : 0;

        return prisma.ticketPanelButton.create({
            data: {
                panelId: panel.id,
                ...data,
                order
            }
        });
    }

    static async removeButton(buttonId: string) {
        return prisma.ticketPanelButton.delete({
            where: { id: buttonId }
        });
    }

    static async getPanelByMessageId(messageId: string) {
        return prisma.ticketPanel.findFirst({
            where: { messageId },
            include: { buttons: { orderBy: { order: 'asc' } } }
        });
    }

    // Render logic
    static async renderPanel(panel: TicketPanel & { buttons: TicketPanelButton[] }) {
        const embed = new EmbedBuilder()
            .setTitle(panel.title)
            .setDescription(panel.description)
            .setColor(panel.color as ColorResolvable || '#00FF00'); // Fallback color

        if (panel.thumbnailUrl) embed.setThumbnail(panel.thumbnailUrl);
        if (panel.imageUrl) embed.setImage(panel.imageUrl);

        const rows: ActionRowBuilder<ButtonBuilder>[] = [];
        let currentRow = new ActionRowBuilder<ButtonBuilder>();

        panel.buttons.forEach((btn, index) => {
            if (index % 5 === 0 && index > 0) {
                rows.push(currentRow);
                currentRow = new ActionRowBuilder<ButtonBuilder>();
            }

            const button = new ButtonBuilder()
                .setCustomId(btn.customId)
                .setLabel(btn.label)
                .setStyle(this.mapButtonStyle(btn.style));

            if (btn.emoji) button.setEmoji(btn.emoji);

            currentRow.addComponents(button);
        });

        if (currentRow.components.length > 0) {
            rows.push(currentRow);
        }

        return { embeds: [embed], components: rows };
    }

    private static mapButtonStyle(style: string): ButtonStyle {
        switch (style.toUpperCase()) {
            case 'PRIMARY': return ButtonStyle.Primary;
            case 'SECONDARY': return ButtonStyle.Secondary;
            case 'SUCCESS': return ButtonStyle.Success;
            case 'DANGER': return ButtonStyle.Danger;
            default: return ButtonStyle.Primary;
        }
    }
}
