import { ButtonInteraction, CacheType, ModalSubmitInteraction, Interaction, TextChannel, StringSelectMenuInteraction } from 'discord.js';
import { TicketService } from './ticket.service';
import { TicketPanels } from './panels';
import { TicketStatus } from './utils';
import { TicketEditor } from './editor';

export class TicketManager {

    static async handleInteraction(interaction: Interaction) {
        // console.log(`[TicketManager] Handling interaction: ${interaction.customId} (Type: ${interaction.type})`);
        if ((interaction.isMessageComponent() || interaction.isModalSubmit()) && interaction.customId.startsWith('editor_')) {
            // console.log('[TicketManager] Routing to Editor');
            await TicketEditor.handleInteraction(interaction);
            return;
        }

        if (interaction.isButton()) {
            await this.handleButton(interaction);
        } else if (interaction.isModalSubmit()) {
            await this.handleModal(interaction);
        }
    }

    private static async handleButton(interaction: ButtonInteraction) {
        const id = interaction.customId;

        // 1. Entry Panel Buttons -> Open Modal
        if (id.startsWith('ticket_create_')) {
            const category = id.split('_')[2];
            // Check if user already has an open ticket?
            const existing = await TicketService.getOpenTicketByUser(interaction.user.id, interaction.guildId!);
            if (existing) {
                return interaction.reply({ content: `You already have an open ticket: <#${existing.channelId}>`, ephemeral: true });
            }
            return interaction.showModal(TicketPanels.getCreateModal(category));
        }

        // 2. Ticket Control Buttons
        if (id === 'ticket_claim') {
            await interaction.deferReply();

            if (!interaction.channel || !interaction.channel.isTextBased()) return;
            const channel = interaction.channel as TextChannel;

            const ticket = await TicketService.getTicketByChannel(channel.id);
            if (!ticket) {
                await interaction.editReply('This channel is not a valid ticket.');
                return;
            }

            if (ticket.status !== TicketStatus.OPEN) {
                await interaction.editReply('Ticket is already claimed or closed.');
                return;
            }

            // Perform Claim
            await TicketService.claimTicket(ticket.id, interaction.user.id, channel);

            // Notify in channel
            await interaction.editReply(`Ticket claimed by ${interaction.user}.`);

            // Update Controls (Remove Claim Button)
            // We need to fetch the original header message if we want to edit it, 
            // OR we just send a new control panel? 
            // Better to update the *existing* controls if possible, but we don't store the control message ID easily.
            // Simplified: Just post a new "Claimed" status embed or rely on the previous controls being "outdated".
            // Ideally: The controls are attached to the welcome message or a persistent message.
            // Let's just create a new set of controls (Close Only) and send them, effectively "refreshing" the UI.

            const controls = TicketPanels.getTicketControls(TicketStatus.CLAIMED);
            await channel.send({ content: 'Ticket updated.', ...controls });
        }

        if (id === 'ticket_close') {
            await interaction.deferReply();

            if (!interaction.channel || !interaction.channel.isTextBased()) return;
            const channel = interaction.channel as TextChannel;

            const ticket = await TicketService.getTicketByChannel(channel.id);
            if (!ticket) {
                await interaction.editReply('This channel is not a valid ticket.');
                return;
            }

            if (ticket.status === TicketStatus.CLOSED) {
                await interaction.editReply('Ticket is already closed.');
                return;
            }

            // Close in DB
            await TicketService.closeTicket(ticket.id, interaction.user.id);

            await interaction.editReply('🔒 Ticket closed. Deleting in 5 seconds...');

            setTimeout(async () => {
                try {
                    await channel.delete();
                } catch (e) {
                    console.error('Failed to delete channel', e);
                }
            }, 5000);
        }
    }

    private static async handleModal(interaction: ModalSubmitInteraction) {
        if (!interaction.customId.startsWith('ticket_modal_')) { return; }

        await interaction.deferReply({ ephemeral: true });

        const category = interaction.customId.split('_')[2];
        const subject = interaction.fields.getTextInputValue('subject');
        const desc = interaction.fields.getTextInputValue('description');

        try {
            const { ticket, channel } = await TicketService.createTicket(
                interaction.guild!,
                interaction.member as any,
                category,
                subject,
                desc
            );

            // Post Header & Controls in new channel
            const controls = TicketPanels.getTicketControls(TicketStatus.OPEN);
            const header = TicketPanels.getHeaderEmbed(interaction.user, category, subject, desc);

            await (channel as TextChannel).send({ ...header, ...controls });

            await interaction.editReply(`Ticket created: ${channel}`);
        } catch (error: any) {
            await interaction.editReply(`Failed to create ticket: ${error.message}`);
        }
    }
}
