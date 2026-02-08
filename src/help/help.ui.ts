import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, Colors, CommandInteraction, PermissionsBitField } from 'discord.js';
import { HelpPage } from './help.types';
import * as Pages from './pages';
import { Branding } from '../config/branding';

export class HelpUI {

    static getPages(interaction: CommandInteraction): HelpPage[] {
        const pages = Object.values(Pages) as HelpPage[];
        // Filter based on permissions
        // Note: interaction.member.permissions is strictly for GuildMember
        const memberPermissions = (interaction.member?.permissions as Readonly<PermissionsBitField>);

        return pages.filter(page => {
            if (!page.adminOnly) return true;
            if (!memberPermissions) return false;
            return memberPermissions.has(PermissionsBitField.Flags.Administrator);
        });
    }

    static getHomeEmbed(): EmbedBuilder {
        return new EmbedBuilder()
            .setTitle(`📘 ${Branding.botName} Help & Guide`)
            .setDescription(`Welcome! **${Branding.botName}** helps manage your server efficiently.\nSelect a category below to learn how each feature works.`)
            .setColor(Branding.primaryColor as any) // Cast as any because strings are valid hex but TS might want resolvable
            .setFooter({ text: Branding.footerText });
    }

    static getPageEmbed(page: HelpPage): EmbedBuilder {
        const embed = new EmbedBuilder()
            .setTitle(`${page.emoji} ${page.title}`)
            .setDescription(page.description)
            .setColor(Branding.primaryColor as any)
            .setFooter({ text: Branding.footerText });

        for (const section of page.sections) {
            embed.addFields({ name: section.title, value: section.content });
        }

        return embed;
    }

    static getNavigationRow(pages: HelpPage[], selectedId?: string): ActionRowBuilder<StringSelectMenuBuilder> {
        const select = new StringSelectMenuBuilder()
            .setCustomId('help_select_module')
            .setPlaceholder('Select a category...')
            .addOptions(
                pages.map(page =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(page.title.replace(/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu, '').trim()) // Remove emoji from label using broad regex
                        .setValue(page.id)
                        .setEmoji(page.emoji)
                        .setDescription(page.description.substring(0, 100))
                        .setDefault(page.id === selectedId)
                )
            );

        return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
    }

    static getButtonRow(isHome: boolean): ActionRowBuilder<ButtonBuilder> {
        const row = new ActionRowBuilder<ButtonBuilder>();

        row.addComponents(
            new ButtonBuilder()
                .setCustomId('help_home')
                .setLabel('Home')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🏠')
                .setDisabled(isHome)
        );

        // We can add previous/next logic later if needed, but select menu handles random access well.
        // Requested "Back" button is effectively "Home" in this flattened hierarchy, or we can track history.
        // For simplicity and clarity, "Home" acts as the main "Back".

        if (Branding.supportUrl) {
            row.addComponents(
                new ButtonBuilder()
                    .setLabel('Support')
                    .setStyle(ButtonStyle.Link)
                    .setURL(Branding.supportUrl)
            );
        }

        row.addComponents(
            new ButtonBuilder()
                .setCustomId('help_close')
                .setLabel('Close')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌')
        );

        return row;
    }
}
