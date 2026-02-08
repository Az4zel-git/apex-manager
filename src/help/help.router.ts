import { StringSelectMenuInteraction, ButtonInteraction, CacheType, InteractionReplyOptions, MessageComponentInteraction } from 'discord.js';
import { HelpUI } from './help.ui';
import * as Pages from './pages';

export class HelpRouter {

    static async handleInteraction(interaction: StringSelectMenuInteraction | ButtonInteraction) {
        // Ownership check: Ensure only the original invoker acts?
        // In this simple model, we might trust the ephemeral nature or check message reference.
        // However, standard slash commands are often public. The user requirement says "Authorized users must not see restricted content".
        // And "Only the invoking user can interact".

        // Since we can't easily track "invoker" without state in a stateless bot, 
        // we heavily rely on "Ephemeral" messages which solve this naturally (only user sees it).
        // If the help message is public, we need to check interaction.user.id vs interaction.message.interaction.user.id

        // Let's assume public /help for now as per requirement "Test: Interaction ownership".

        if (interaction.message.interaction && interaction.user.id !== interaction.message.interaction.user.id) {
            await interaction.reply({ content: '⛔ This help menu belongs to someone else. Run `/help` to open your own.', ephemeral: true });
            return;
        }

        const customId = interaction.customId;

        if (customId === 'help_close') {
            await interaction.message.delete().catch(() => { }); // Try to delete
            return;
        }

        if (customId === 'help_home') {
            const pages = HelpUI.getPages(interaction as any); // Type cast is safe enough here
            await interaction.update({
                embeds: [HelpUI.getHomeEmbed()],
                components: [HelpUI.getNavigationRow(pages), HelpUI.getButtonRow(true)]
            });
            return;
        }

        if (customId === 'help_select_module') {
            const selectInter = interaction as StringSelectMenuInteraction;
            const selectedId = selectInter.values[0];
            const pages = HelpUI.getPages(interaction as any);
            const page = pages.find(p => p.id === selectedId);

            if (!page) {
                await interaction.reply({ content: '❌ Module not found.', ephemeral: true });
                return;
            }

            await interaction.update({
                embeds: [HelpUI.getPageEmbed(page)],
                components: [HelpUI.getNavigationRow(pages, selectedId), HelpUI.getButtonRow(false)]
            });
        }
    }
}
