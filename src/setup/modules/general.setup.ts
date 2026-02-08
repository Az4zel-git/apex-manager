import { ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType, ComponentType, EmbedBuilder, Colors, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { SetupContext, SetupModule } from '../setup.types';
import { prisma } from '../../db';

const KEY = 'general_config';

export const generalSetupModule: SetupModule = {
    key: KEY,
    label: 'General Configuration',
    description: 'Configure core settings (Logs, Join to Create)',
    emoji: '⚙️',

    getInitialStep: async (context: SetupContext) => {
        return sendInternalMenu(context);
    },

    handleInteraction: async (context: SetupContext, customId: string, values?: string[]) => {
        const { interaction, guildId } = context;

        if (customId === 'general_config_menu') {
            const selected = values?.[0];
            if (!selected) return;

            if (selected === 'back') {
                if (interaction.isMessageComponent()) {
                    await interaction.update({ content: 'Use `/setup` to go back to the main menu.', components: [], embeds: [] });
                } else {
                    await interaction.editReply({ content: 'Use `/setup` to go back to the main menu.', components: [], embeds: [] });
                }
                return;
            }

            // Show Channel Selector
            const isGenerator = selected === 'config_generator';
            const channelSelect = new ChannelSelectMenuBuilder()
                .setCustomId(isGenerator ? 'general_config_select:generator' : 'general_config_select:logs')
                .setPlaceholder(isGenerator ? 'Select Voice Channel' : 'Select Text Channel')
                .setChannelTypes(isGenerator ? [ChannelType.GuildVoice] : [ChannelType.GuildText])
                .setMinValues(1)
                .setMaxValues(1);

            const row = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(channelSelect);



            if (interaction.isMessageComponent()) {
                await interaction.update({
                    content: `Select the channel for **${isGenerator ? "'Join to Create'" : 'Moderation Logs'}**:`,
                    components: [row],
                    embeds: []
                });
            } else {
                await interaction.editReply({
                    content: `Select the channel for **${isGenerator ? "'Join to Create'" : 'Moderation Logs'}**:`,
                    components: [row],
                    embeds: []
                });
            }
        }
        else if (customId.startsWith('general_config_select:')) {
            const type = customId.split(':')[1];
            const channelId = values?.[0];
            if (!channelId) return;

            if (type === 'generator') {
                await prisma.guildConfig.update({
                    where: { guildId },
                    data: { generatorChannelId: channelId }
                });
            } else {
                await prisma.guildConfig.update({
                    where: { guildId },
                    data: { logChannelId: channelId }
                });
            }

            if (interaction.isMessageComponent()) {
                await interaction.update({ content: '✅ Configuration updated!', components: [], embeds: [] });
            } else {
                await interaction.editReply({ content: '✅ Configuration updated!', components: [], embeds: [] });
            }
            // Optionally show the menu again
            // await sendInternalMenu(context); 
        }
    }
};

async function sendInternalMenu(context: SetupContext) {
    const { interaction, guildId } = context;

    // Fetch current config to show in embed
    const config = await prisma.guildConfig.findUnique({ where: { guildId } });

    const embed = new EmbedBuilder()
        .setTitle('General Configuration')
        .setColor(Colors.Blue)
        .setDescription(`Current Settings:\n\n**'Join to Create' Channel:** ${config?.generatorChannelId ? `<#${config.generatorChannelId}>` : 'Not Set'}\n**Log Channel:** ${config?.logChannelId ? `<#${config.logChannelId}>` : 'Not Set'}`)
        .addFields({ name: 'Instructions', value: 'Select an option to configure.' });

    const select = new StringSelectMenuBuilder()
        .setCustomId('general_config_menu')
        .setPlaceholder('Select setting to change')
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel("Set 'Join to Create' Channel")
                .setDescription('Channel for voice creation functionality')
                .setValue('config_generator')
                .setEmoji('🔊'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Set Log Channel')
                .setDescription('Channel for moderation logs')
                .setValue('config_logs')
                .setEmoji('📜'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Back')
                .setValue('back')
                .setEmoji('🔙')
        );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    if (interaction.isRepliable()) {
        if (interaction.isMessageComponent()) {
            await interaction.update({ embeds: [embed], components: [row] });
        } else {
            await interaction.editReply({ embeds: [embed], components: [row] });
        }
    }
}
