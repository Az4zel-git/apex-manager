import {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    EmbedBuilder,
    Colors,
    ChatInputCommandInteraction,
    ComponentType,
    StringSelectMenuInteraction
} from 'discord.js';
import { setupRegistry } from './setup.registry';
import { prisma } from '../db';
import { logger } from '../utils/logger';

export class SetupRouter {

    static async start(interaction: ChatInputCommandInteraction) {
        const guildId = interaction.guildId;
        if (!guildId) return;

        // Defer if not already deferred
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral: true });
        }

        await this.sendMainMenu(interaction);
    }

    static async sendMainMenu(interaction: any) {
        const embed = new EmbedBuilder()
            .setTitle('Bot Setup')
            .setColor(Colors.Blue)
            .setDescription('Select a module to configure.')
            .addFields({ name: 'Instructions', value: 'Choose a feature below to start setup.' });

        const options = setupRegistry.getAll().map(module =>
            new StringSelectMenuOptionBuilder()
                .setLabel(module.label)
                .setDescription(module.description)
                .setValue(module.key)
                .setEmoji(module.emoji || '⚙️')
        );

        // Add Finish option
        options.push(
            new StringSelectMenuOptionBuilder()
                .setLabel('Finish Setup')
                .setDescription('Close this menu')
                .setValue('finish')
                .setEmoji('✅')
        );

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('setup_main_menu')
            .setPlaceholder('Select configuration category')
            .addOptions(options);

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

        if (interaction.isMessageComponent && interaction.isMessageComponent()) {
            await interaction.update({
                embeds: [embed],
                components: [row],
                content: ''
            });
        } else if (interaction.editReply) {
            await interaction.editReply({
                embeds: [embed],
                components: [row],
                content: ''
            });
        }
    }

    static async handleInteraction(context: { guildId: string, interaction: StringSelectMenuInteraction | any }) {
        try {
            const { interaction } = context;
            logger.info(`[SetupRouter] Handling interaction: ${interaction.customId} for user ${interaction.user.id}`);

            // Main menu
            if (interaction.customId === 'setup_main_menu' && interaction.isStringSelectMenu()) {
                const selectedKey = interaction.values[0];

                if (selectedKey === 'finish') {
                    await interaction.update({ content: 'Setup completed.', components: [], embeds: [] });
                    return;
                }

                const module = setupRegistry.get(selectedKey);
                if (module) {
                    // Delegate to module
                    await module.getInitialStep({ guildId: interaction.guildId!, interaction });
                } else {
                    await interaction.reply({ content: 'Module not found.', ephemeral: true });
                }
                return;
            }

            // Module specific routing via prefix
            const customId = interaction.customId;
            const modules = setupRegistry.getAll();

            for (const module of modules) {
                if (customId.startsWith(module.key + '_') || customId.startsWith(module.key + ':')) {

                    // Handle Modal Values
                    let values: string[] | undefined;
                    if (interaction.isStringSelectMenu() || interaction.isChannelSelectMenu()) {
                        values = interaction.values;
                    } else if (interaction.isModalSubmit()) {
                        // Extract all field values in order? Or let the module handle extraction via context?
                        // For simplicity, let's pass an array of field values if we can, 
                        // BUT better to rely on the module accessing interaction.fields directly.
                        // We'll pass undefined values and let module cast interaction to ModalSubmitInteraction.
                    }

                    await module.handleInteraction(
                        { guildId: interaction.guildId!, interaction },
                        customId,
                        values
                    );
                    return;
                }
            }
        } catch (error) {
            logger.error('[SetupRouter] Critical error in handleInteraction:', error);
            // Attempt to reply if possible to let user know
            const { interaction } = context;
            if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'An unexpected error occurred during setup. Please check logs.', ephemeral: true }).catch(() => { });
            }
        }
    }
}
