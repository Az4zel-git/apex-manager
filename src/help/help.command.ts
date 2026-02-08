import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { Command } from '../commands/command.interface';
import { HelpUI } from './help.ui';
import * as Pages from './pages';

export const helpCommand: Command = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Open the interactive help guide.')
        .addStringOption(option =>
            option.setName('module')
                .setDescription('Jump directly to a module')
                .setRequired(false)
                .addChoices(
                    ...Object.values(Pages).map(p => ({ name: p.title, value: p.id }))
                )
        ),

    execute: async (interaction: CommandInteraction) => {
        // Safe cast to ChatInputCommandInteraction to access options
        const chatInteraction = interaction as any;
        const module = chatInteraction.options.getString('module');
        const pages = HelpUI.getPages(interaction);

        if (module) {
            const page = pages.find(p => p.id === module);
            if (page) {
                await interaction.reply({
                    embeds: [HelpUI.getPageEmbed(page)],
                    components: [HelpUI.getNavigationRow(pages, module), HelpUI.getButtonRow(false)]
                });
                return;
            }
        }

        await interaction.reply({
            embeds: [HelpUI.getHomeEmbed()],
            components: [HelpUI.getNavigationRow(pages), HelpUI.getButtonRow(true)]
        });
    }
};
