import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { TicketColors, TicketStatus } from './utils';
import { Branding } from '../config/branding';

export const TicketPanels = {
    getEntryPanel: () => {
        const embed = new EmbedBuilder()
            .setTitle('Support Tickets')
            .setDescription('Need help? Click a button below to open a ticket.')
            .setColor(TicketColors.OPEN)
            .setFooter({ text: Branding.footerText });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_create_order')
                .setLabel('Order Support')
                .setEmoji('🛒')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('ticket_create_issue')
                .setLabel('Report Issue')
                .setEmoji('🔴')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('ticket_create_help')
                .setLabel('General Help')
                .setEmoji('❓')
                .setStyle(ButtonStyle.Secondary)
        );

        return { embeds: [embed], components: [row] };
    },

    getCreateModal: (category: string) => {
        const modal = new ModalBuilder()
            .setCustomId(`ticket_modal_${category}`)
            .setTitle(`New ${category.charAt(0).toUpperCase() + category.slice(1)} Ticket`);

        const subjectInput = new TextInputBuilder()
            .setCustomId('subject')
            .setLabel('Subject')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100);

        const descInput = new TextInputBuilder()
            .setCustomId('description')
            .setLabel('Description')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000);

        const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(subjectInput);
        const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(descInput);

        modal.addComponents(row1, row2);
        return modal;
    },

    getHeaderEmbed: (user: any, category: string, subject: string, description: string) => {
        const embed = new EmbedBuilder()
            .setTitle(`${category.toUpperCase()} Ticket`)
            .setDescription(`Ticket created by ${user}\n\n**Subject:** ${subject}\n**Description:**\n${description}`)
            .setColor(TicketColors.OPEN)
            .setTimestamp();

        return { embeds: [embed] };
    },

    getTicketControls: (status: TicketStatus) => {
        const row = new ActionRowBuilder<ButtonBuilder>();

        if (status === TicketStatus.OPEN) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_claim')
                    .setLabel('Claim Ticket')
                    .setEmoji('🙋')
                    .setStyle(ButtonStyle.Primary)
            );
        }

        row.addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_close')
                .setLabel('Close')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Danger)
        );

        return { components: [row] };
    }
};
