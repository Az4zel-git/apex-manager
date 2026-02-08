import { Events, Interaction, ButtonInteraction, ModalSubmitInteraction, GuildMember, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ModalActionRowComponentBuilder, UserSelectMenuBuilder, UserSelectMenuInteraction, ButtonStyle, VoiceChannel, ButtonBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, StringSelectMenuInteraction } from 'discord.js';
import { Event } from './event.interface';
import { TicketManager } from '../tickets/ticket.manager';
import { VoiceService } from '../services/voice.service';
import { logger } from '../utils/logger';
import { commands } from '../commands';
import { prisma } from '../db';
import { DashboardController } from '../mod-center/dashboard.controller';

const dashboardController = new DashboardController(prisma);
import { HelpRouter } from '../help/help.router';
import { SetupRouter } from '../setup/setup.router';
import { setupRegistry } from '../setup/setup.registry';

const event: Event<Events.InteractionCreate> = {
    name: Events.InteractionCreate,
    execute: async (interaction: Interaction) => {
        // 1. Handle Chat Input Commands
        if (interaction.isChatInputCommand()) {
            const command = commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction);
            } catch (error) {
                logger.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'Error executing command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'Error executing command!', ephemeral: true });
                }
            }
            return;
        }

        // HELP SYSTEM ROUTING
        if ((interaction.isButton() || interaction.isStringSelectMenu()) && interaction.customId.startsWith('help_')) {
            await HelpRouter.handleInteraction(interaction);
            return;
        }

        // TICKET SYSTEM ROUTING
        if ((interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu() || interaction.isChannelSelectMenu()) && (interaction.customId.startsWith('ticket_') || interaction.customId.startsWith('editor_'))) {
            await TicketManager.handleInteraction(interaction);
            return;
        }

        // MOD CENTER ROUTING
        if ((interaction.isButton() || interaction.isAnySelectMenu()) && interaction.customId.startsWith('mod_')) {
            logger.info(`[ModCenter] Received interaction: ${interaction.customId} from ${interaction.user.tag}`);
            try {
                await dashboardController.handleInteraction(interaction);
            } catch (err) {
                logger.error('[ModCenter] Handler error:', err);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: 'Handler error.', ephemeral: true });
                }
            }
            return;
        }

        // SETUP ROUTING
        if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isChannelSelectMenu() || interaction.isModalSubmit()) {
            const isSetup = interaction.customId.startsWith('setup_');
            const isModule = setupRegistry.getAll().some(m => interaction.customId.startsWith(m.key + '_') || interaction.customId.startsWith(m.key + ':'));

            if (isSetup || isModule) {
                await SetupRouter.handleInteraction({ guildId: interaction.guildId!, interaction });
                return;
            }
        }

        // 2. Filter for VC Manager interactions (Legacy/Voice)
        if (!interaction.isButton() && !interaction.isModalSubmit() && !interaction.isUserSelectMenu() && !interaction.isStringSelectMenu()) return;
        if (!interaction.isButton() && !interaction.isModalSubmit() && !interaction.isUserSelectMenu() && !interaction.isStringSelectMenu()) return;
        const comp = interaction as ButtonInteraction | ModalSubmitInteraction | UserSelectMenuInteraction;
        if (!comp.customId.startsWith('vc_')) return;

        const channel = interaction.channel;
        if (!channel || !channel.isVoiceBased()) {
            if (!interaction.isModalSubmit()) await interaction.reply({ content: 'Voice channels only.', ephemeral: true });
            return;
        }
        const voiceChannel = channel as VoiceChannel;
        const member = interaction.member as GuildMember;
        const ownerId = await VoiceService.getOwner(channel.id);
        const isOwner = ownerId === member.id;

        // 3. Handle Back Button (Common)
        if (comp.customId === 'vc_back' && comp.isButton()) {
            await comp.update({ components: VoiceService.getControlPanelComponents() });
            return;
        }

        // 4. Handle Menu Triggers (Buttons that open Select Menus)
        // [Kick, Ban, Permit, Transfer]
        if (['vc_kick', 'vc_ban', 'vc_permit', 'vc_transfer'].includes(comp.customId)) {
            if (!isOwner) { await comp.reply({ content: 'Owner only.', ephemeral: true }); return; }
            if (!comp.isButton()) return; // Type guard

            let placeholder = 'Select User';
            let menuId = `${comp.customId}_sel`; // e.g. vc_kick_sel

            if (comp.customId === 'vc_kick') placeholder = 'Select user to Kick';
            if (comp.customId === 'vc_ban') placeholder = 'Select user to Ban';
            if (comp.customId === 'vc_permit') placeholder = 'Select user to Permit';
            if (comp.customId === 'vc_transfer') placeholder = 'Select New Owner';

            const row1 = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
                new UserSelectMenuBuilder().setCustomId(menuId).setPlaceholder(placeholder).setMaxValues(1)
            );
            const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('vc_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
            );
            await comp.update({ components: [row1, row2] });
            return;
        }

        // 5. Handle Modal Triggers (Buttons that open Modals)
        // [Rename, Limit, Bitrate]
        if (['vc_rename', 'vc_limit', 'vc_bitrate'].includes(comp.customId)) {
            if (!isOwner) { await comp.reply({ content: 'Owner only.', ephemeral: true }); return; }
            if (!comp.isButton()) return;

            const modal = new ModalBuilder();

            if (comp.customId === 'vc_rename') {
                modal.setCustomId('vc_rename_modal').setTitle('Rename Channel');
                modal.addComponents(new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
                    new TextInputBuilder().setCustomId('val').setLabel('New Name').setStyle(TextInputStyle.Short)
                ));
            } else if (comp.customId === 'vc_limit') {
                modal.setCustomId('vc_limit_modal').setTitle('User Limit');
                modal.addComponents(new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
                    new TextInputBuilder().setCustomId('val').setLabel('Limit (0-99)').setStyle(TextInputStyle.Short)
                ));
            } else if (comp.customId === 'vc_bitrate') {
                modal.setCustomId('vc_bitrate_modal').setTitle('Bitrate');
                modal.addComponents(new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
                    new TextInputBuilder().setCustomId('val').setLabel('Bitrate (8-96 kbps)').setStyle(TextInputStyle.Short).setPlaceholder('64')
                ));
            }
            await comp.showModal(modal);
            return;
        }

        // 6. Handle Select Menu Submissions
        if (comp.isUserSelectMenu()) {
            const selectedId = comp.values[0];
            let reply = 'Done';

            await comp.deferUpdate(); // Keep interface snappy, update later or send followup

            if (comp.customId === 'vc_permit_sel') {
                await VoiceService.permitUser(voiceChannel, selectedId);
                reply = `Permitted <@${selectedId}>`;
            } else if (comp.customId === 'vc_kick_sel') {
                if (!voiceChannel.members.has(selectedId)) {
                    reply = `User <@${selectedId}> is not in the channel.`;
                } else {
                    await VoiceService.kickUser(voiceChannel, selectedId);
                    reply = `Kicked <@${selectedId}>`;
                }
            } else if (comp.customId === 'vc_ban_sel') {
                if (!voiceChannel.members.has(selectedId)) {
                    reply = `User <@${selectedId}> is not in the channel.`;
                } else {
                    await VoiceService.banUser(voiceChannel, selectedId);
                    reply = `Banned <@${selectedId}>`;
                }
            } else if (comp.customId === 'vc_transfer_sel') {
                const target = await voiceChannel.guild.members.fetch(selectedId).catch(() => null);
                if (target) {
                    await VoiceService.claimChannel(voiceChannel, target);
                    reply = `Ownership transferred to <@${selectedId}>`;
                }
            }

            // Restore Interface
            await comp.editReply({ components: VoiceService.getControlPanelComponents() });
            await comp.followUp({ content: reply, ephemeral: true });
            return;
        }

        // 7. Handle Modal Submissions
        if (comp.isModalSubmit()) {
            await comp.deferReply({ ephemeral: true });
            const val = comp.fields.getTextInputValue('val');

            if (comp.customId === 'vc_rename_modal') {
                await VoiceService.renameChannel(voiceChannel, val);
                await comp.editReply(`Renamed to ${val}`);
            } else if (comp.customId === 'vc_limit_modal') {
                const num = parseInt(val);
                if (!isNaN(num)) {
                    await VoiceService.setLimit(voiceChannel, num);
                    await comp.editReply(`Limit set to ${num}`);
                } else await comp.editReply('Invalid Number');
            } else if (comp.customId === 'vc_bitrate_modal') {
                const num = parseInt(val);
                if (!isNaN(num)) {
                    const bps = Math.max(8000, Math.min(96000, num * 1000));
                    await VoiceService.setBitrate(voiceChannel, bps);
                    await comp.editReply(`Bitrate set to ${bps / 1000}kbps`);
                } else await comp.editReply('Invalid Number');
            }
            return;
        }

        // 8. Handle Standard Action Buttons
        // [Lock, Unlock, Hide, Show, Reset, Block, Info]
        if (comp.isButton()) {
            const id = comp.customId;
            if (id === 'vc_info') {
                await comp.reply({ content: `Owner: <@${ownerId}>\nBitrate: ${voiceChannel.bitrate / 1000}kbps\nLimit: ${voiceChannel.userLimit}`, ephemeral: true });
                return;
            }
            if (!isOwner) { await comp.reply({ content: 'Owner only.', ephemeral: true }); return; }

            await comp.deferReply({ ephemeral: true });

            if (id === 'vc_lock') { await VoiceService.lockChannel(voiceChannel); await comp.editReply('Locked 🔒'); }
            if (id === 'vc_unlock') { await VoiceService.unlockChannel(voiceChannel); await comp.editReply('Unlocked 🔓'); }
            if (id === 'vc_hide') { await VoiceService.hideChannel(voiceChannel); await comp.editReply('Hidden 🚫'); }
            if (id === 'vc_show') { await VoiceService.showChannel(voiceChannel); await comp.editReply('Visible 🌐'); }
            if (id === 'vc_reset') { await VoiceService.resetPermissions(voiceChannel); await comp.editReply('Permissions Reset 🔄'); }
            if (id === 'vc_block') { await comp.editReply('Use Ban to block users.'); } // Or implement block menu if needed, but Ban covers it.
        }
    }
};

export default event;
