import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuOptionBuilder, EmbedBuilder, Interaction, ButtonInteraction, StringSelectMenuInteraction, ModalSubmitInteraction, TextChannel, ComponentType, ChannelSelectMenuBuilder, ChannelType } from 'discord.js';
import { prisma } from '../db';
import { TicketPanelService } from './panel.service';
import { TicketPanel, TicketPanelButton } from '@prisma/client';

export class TicketEditor {

    // --- MASTER DASHBOARD ---
    static async sendManager(interaction: Interaction) {
        if (!interaction.guildId) return;

        const panels = await prisma.ticketPanel.findMany({ where: { guildId: interaction.guildId } });

        const embed = new EmbedBuilder()
            .setTitle('Ticket Panel Manager')
            .setDescription('Select a panel to edit or create a new one.')
            .setColor('#2b2d31');

        const components: any[] = [];

        const rowButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('editor_manager_create').setLabel('Create New Panel').setStyle(ButtonStyle.Success).setEmoji('✨'),
            new ButtonBuilder().setCustomId('editor_manager_refresh').setLabel('Refresh List').setStyle(ButtonStyle.Secondary).setEmoji('🔄')
        );
        components.push(rowButtons);

        if (panels.length > 0) {
            const select = new StringSelectMenuBuilder()
                .setCustomId('editor_manager_select')
                .setPlaceholder('Select a panel to edit...');

            panels.forEach(p => {
                select.addOptions(new StringSelectMenuOptionBuilder().setLabel(p.name).setValue(p.id).setDescription(p.title.substring(0, 90)));
            });
            components.push(new ActionRowBuilder().addComponents(select));
        } else {
            embed.setDescription('No panels found. Click "Create New Panel" to get started.');
        }

        const payload = { embeds: [embed], components, ephemeral: true };

        if (interaction.isMessageComponent()) {
            await interaction.update(payload);
        } else if (interaction.isRepliable()) {
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(payload);
            } else {
                await interaction.reply(payload);
            }
        }
    }

    // --- MAIN EDITOR MENU ---
    static async sendMainEditor(interaction: Interaction, panelIdOrName: string) {
        // Resolve panel
        const panel = await this.resolvePanel(interaction.guildId!, panelIdOrName);
        if (!panel) {
            if (interaction.isRepliable()) await interaction.reply({ content: 'Panel not found.', ephemeral: true });
            return;
        }

        const previewEmbed = new EmbedBuilder()
            .setTitle(`EDITING: ${panel.name}`)
            .setDescription(`**Current Title:** ${panel.title}\n**Current Description:** ${panel.description}\n**Button Count:** ${panel.buttons.length}`)
            .setColor(panel.color as any || '#00FF00');

        const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`editor_edit_embed_${panel.id}`).setLabel('Edit Appearance').setStyle(ButtonStyle.Primary).setEmoji('🎨'),
            new ButtonBuilder().setCustomId(`editor_manage_buttons_${panel.id}`).setLabel('Manage Buttons').setStyle(ButtonStyle.Secondary).setEmoji('🔘')
        );

        const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`editor_preview_${panel.id}`).setLabel('Preview').setStyle(ButtonStyle.Secondary).setEmoji('👁️'),
            new ButtonBuilder().setCustomId(`editor_send_channel_${panel.id}`).setLabel('Send to Channel').setStyle(ButtonStyle.Success).setEmoji('📨'),
            new ButtonBuilder().setCustomId(`editor_delete_${panel.id}`).setLabel('Delete').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
            new ButtonBuilder().setCustomId('editor_back_manager').setLabel('Back to Menu').setStyle(ButtonStyle.Secondary).setEmoji('↩️')
        );

        const payload = { embeds: [previewEmbed], components: [row1, row2], ephemeral: true };

        if (interaction.isMessageComponent()) {
            await interaction.update(payload);
        } else if (interaction.isRepliable()) {
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply(payload);
            } else {
                await interaction.reply(payload);
            }
        }
    }

    // --- MANAGE BUTTONS MENU ---
    static async sendButtonManager(interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction, panelId: string) {
        const panel = await TicketPanelService.getPanelById(panelId);
        if (!panel) return;

        const embed = new EmbedBuilder().setTitle(`Manage Buttons: ${panel.name}`).setColor('#0099ff');

        let desc = panel.buttons.length === 0 ? "No buttons configured." : "Current Buttons:\n";
        panel.buttons.forEach((b, i) => desc += `${i + 1}. ${b.emoji || ''} **${b.label}** (${b.style})\n`);
        embed.setDescription(desc);

        const rowControls = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`editor_add_btn_${panel.id}`).setLabel('Add Button').setStyle(ButtonStyle.Success).setEmoji('➕'),
            new ButtonBuilder().setCustomId(`editor_back_${panel.id}`).setLabel('Back').setStyle(ButtonStyle.Secondary).setEmoji('⬅️')
        );

        const components: any[] = [rowControls];

        if (panel.buttons.length > 0) {
            const removeSelect = new StringSelectMenuBuilder()
                .setCustomId(`editor_remove_btn_select_${panel.id}`)
                .setPlaceholder('Select a button to remove');

            panel.buttons.forEach(b => {
                removeSelect.addOptions(new StringSelectMenuOptionBuilder().setLabel(b.label).setValue(b.id).setDescription(b.customId));
            });

            components.push(new ActionRowBuilder().addComponents(removeSelect));
        }

        const payload = { embeds: [embed], components: components };

        if (interaction.isMessageComponent()) {
            await interaction.update(payload);
        } else if (interaction.isRepliable()) {
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(payload);
            } else {
                await interaction.reply({ ...payload, ephemeral: true });
            }
        }
    }

    // --- INTERACTION HANDLER ---
    // Router for all 'editor_' interactions
    static async handleInteraction(interaction: Interaction) {
        if (!interaction.guildId) return;

        // 1. BUTTONS & SELECTS
        if (interaction.isButton() || interaction.isAnySelectMenu()) {
            const id = interaction.customId;
            console.log(`[TicketEditor] Processing ID: ${id}`);

            // Manager Interactions
            if (id === 'editor_manager_create') {
                const modal = new ModalBuilder().setCustomId('editor_modal_create_panel').setTitle('Create New Panel');
                modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('name').setLabel('Panel Name (Unique Identifier)').setStyle(TextInputStyle.Short).setRequired(true)));
                await interaction.showModal(modal);
                return;
            }

            if (id === 'editor_manager_refresh' || id === 'editor_back_manager') {
                await this.sendManager(interaction);
                return;
            }

            if (id === 'editor_manager_select') {
                if (!interaction.isStringSelectMenu()) return;
                await this.sendMainEditor(interaction, interaction.values[0]);
                return;
            }

            // Editor Interactions
            if (id.startsWith('editor_back_')) {
                const panelId = id.replace('editor_back_', '');
                if (panelId === 'manager') {
                    await this.sendManager(interaction);
                } else {
                    await this.sendMainEditor(interaction, panelId);
                }
                return;
            }

            if (id.startsWith('editor_edit_embed_')) {
                const panelId = id.replace('editor_edit_embed_', '');
                const panel = await TicketPanelService.getPanelById(panelId);
                if (!panel) return;

                const modal = new ModalBuilder().setCustomId(`editor_modal_embed_${panelId}`).setTitle('Edit Embed Appearance');
                modal.addComponents(
                    new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('title').setLabel('Title').setStyle(TextInputStyle.Short).setValue(panel.title).setRequired(true)),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('desc').setLabel('Description').setStyle(TextInputStyle.Paragraph).setValue(panel.description).setRequired(true)),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('color').setLabel('Color (Hex)').setStyle(TextInputStyle.Short).setValue(panel.color || '#00FF00').setRequired(true))
                );
                await interaction.showModal(modal);
                return;
            }

            if (id.startsWith('editor_manage_buttons_')) {
                const panelId = id.replace('editor_manage_buttons_', '');
                await this.sendButtonManager(interaction as ButtonInteraction, panelId);
                return;
            }

            if (id.startsWith('editor_add_btn_')) {
                const panelId = id.replace('editor_add_btn_', '');
                const modal = new ModalBuilder().setCustomId(`editor_modal_addbtn_${panelId}`).setTitle('Add Button');
                modal.addComponents(
                    new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('label').setLabel('Button Label').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('style').setLabel('Color (Blue, Green, Red, Neutral)').setStyle(TextInputStyle.Short).setValue('Blue').setRequired(true))
                );
                await interaction.showModal(modal);
                return;
            }

            if (id.startsWith('editor_remove_btn_select_')) {
                if (!interaction.isStringSelectMenu()) return;
                const panelId = id.replace('editor_remove_btn_select_', '');
                const btnId = interaction.values[0];
                await TicketPanelService.removeButton(btnId);
                await this.sendButtonManager(interaction as StringSelectMenuInteraction, panelId);
                return;
            }

            if (id.startsWith('editor_delete_')) {
                const panelId = id.replace('editor_delete_', '');
                const panel = await TicketPanelService.getPanelById(panelId);
                if (panel) await TicketPanelService.deletePanel(interaction.guildId, panel.name);
                await this.sendManager(interaction);
                return;
            }

            if (id.startsWith('editor_preview_')) {
                const panelId = id.replace('editor_preview_', '');
                const panel = await TicketPanelService.getPanelById(panelId);
                if (panel) {
                    const payload = await TicketPanelService.renderPanel(panel);
                    await interaction.reply({ ...payload, ephemeral: true, content: 'This is a preview. NOTE: Buttons will open actual tickets.' });
                }
                return;
            }

            // Send to Channel Flow
            if (id.startsWith('editor_send_channel_')) {
                const panelId = id.replace('editor_send_channel_', '');
                // Show Channel Select Menu
                const channelSelect = new ChannelSelectMenuBuilder()
                    .setCustomId(`editor_final_send_${panelId}`)
                    .setPlaceholder('Select channel to post panel')
                    .setChannelTypes(ChannelType.GuildText);

                const rowSelect = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(channelSelect);

                await interaction.reply({ content: 'Select where to post this panel:', components: [rowSelect], ephemeral: true });
                return;
            }

            if (id.startsWith('editor_final_send_')) {
                // Handles the channel selection
                if (!interaction.isChannelSelectMenu()) return;

                await interaction.deferUpdate();

                try {
                    const panelId = id.replace('editor_final_send_', '');
                    const channelId = interaction.values[0];
                    const channel = await interaction.guild?.channels.fetch(channelId) as TextChannel;

                    if (!channel || !channel.isTextBased()) {
                        await interaction.editReply({ content: 'Invalid channel selected. Must be a text channel.', components: [] });
                        return;
                    }

                    const panel = await TicketPanelService.getPanelById(panelId);
                    if (panel) {
                        const payload = await TicketPanelService.renderPanel(panel);
                        const sent = await channel.send(payload);
                        await TicketPanelService.updatePanelId(panelId, { channelId: channel.id, messageId: sent.id });
                        await interaction.editReply({ content: `✅ Panel sent to ${channel}!`, components: [] });
                    } else {
                        await interaction.editReply({ content: 'Panel not found or deleted.', components: [] });
                    }
                } catch (e: any) {
                    console.error('Failed to send panel:', e);
                    await interaction.editReply({ content: `❌ Error sending panel: ${e.message || 'Unknown error'}. Check bot permissions.`, components: [] });
                }
                return;
            }
        }

        // 2. MODALS
        if (interaction.isModalSubmit()) {
            const id = interaction.customId;

            if (id === 'editor_modal_create_panel') {
                const name = interaction.fields.getTextInputValue('name');
                try {
                    await TicketPanelService.createPanel(interaction.guildId!, name);
                    await this.sendManager(interaction);
                } catch (e) {
                    // Check if error is simple text or object
                    await interaction.reply({ content: `Error creating panel: ${e}`, ephemeral: true });
                }
                return;
            }

            if (id.startsWith('editor_modal_embed_')) {
                const panelId = id.replace('editor_modal_embed_', '');
                const title = interaction.fields.getTextInputValue('title');
                const desc = interaction.fields.getTextInputValue('desc');
                const color = interaction.fields.getTextInputValue('color');

                await TicketPanelService.updatePanelId(panelId, { title, description: desc, color });
                await this.sendMainEditor(interaction, panelId);
                return;
            }

            if (id.startsWith('editor_modal_addbtn_')) {
                const panelId = id.replace('editor_modal_addbtn_', '');
                const label = interaction.fields.getTextInputValue('label');
                const styleInput = interaction.fields.getTextInputValue('style').toUpperCase();

                let style = 'PRIMARY'; // Default Blue
                if (['SECONDARY', 'GREY', 'GRAY', 'NEUTRAL'].includes(styleInput)) style = 'SECONDARY';
                if (['SUCCESS', 'GREEN'].includes(styleInput)) style = 'SUCCESS';
                if (['DANGER', 'RED'].includes(styleInput)) style = 'DANGER';

                const category = label.toLowerCase().replace(/[^a-z0-9]/g, '_'); // Sanitize label for customId

                const panel = await TicketPanelService.getPanelById(panelId);
                if (panel) {
                    await TicketPanelService.addButton(interaction.guildId, panel.name, {
                        label,
                        style,
                        emoji: undefined,
                        customId: `ticket_create_${category}`
                    });
                    await this.sendButtonManager(interaction, panelId);
                }
                return;
            }
        }
    }

    private static async resolvePanel(guildId: string, idOrName: string): Promise<TicketPanel & { buttons: TicketPanelButton[] } | null> {
        // Try getting by ID first (UUID)
        let panel = await TicketPanelService.getPanelById(idOrName);
        if (panel) return panel;

        // Then by Name
        return TicketPanelService.getPanelByName(guildId, idOrName);
    }
}
