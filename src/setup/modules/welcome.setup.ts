import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder, Colors, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelSelectMenuBuilder, ChannelType } from 'discord.js';
import { SetupContext, SetupModule } from '../setup.types';
import { prisma } from '../../db';
import { logger } from '../../utils/logger';
import { WelcomeConfig } from '../../services/welcome.service';

const KEY = 'welcome';

export const welcomeModule: SetupModule = {
    key: KEY,
    label: 'Auto-Welcome',
    description: 'Customize welcome messages, banners, and auto-delete.',
    emoji: '👋',

    getInitialStep: async (context: SetupContext) => {
        return sendStep1(context);
    },

    handleInteraction: async (context: SetupContext, customId: string, values?: string[]) => {
        const { interaction } = context;
        const guildId = context.guildId;

        // Load Config
        const feature = await prisma.guildFeature.findUnique({ where: { guildId_featureKey: { guildId, featureKey: KEY } } });
        let config: WelcomeConfig = feature ? JSON.parse(feature.config) : {
            enabled: false,
            mentionUser: true,
            titleTemplate: 'Welcome to {server}!',
            descriptionTemplate: 'Welcome {user} to the community!',
            embedColor: '#5865F2',
            showThumbnail: true,
            fields: [],
            autoDelete: false,
            deleteAfterSeconds: 60
        };

        // --- HANDLERS ---

        // --- HANDLERS ---

        if (customId === 'welcome_toggle') {
            config.enabled = !config.enabled;
            await saveConfig(guildId, config);
            await sendStep1(context);
        }
        else if (customId === 'welcome_channel') {
            config.channelId = values?.[0];
            await saveConfig(guildId, config);
            await sendStep1(context);
        }
        else if (customId === 'welcome_next:step2') {
            if (!config.channelId) {
                await interaction.reply({ content: '❌ Please select a channel first.', ephemeral: true });
                return;
            }
            await sendStep2(interaction, config);
        }
        else if (customId === 'welcome_back:step1') {
            await sendStep1(context);
        }
        else if (customId === 'welcome_edit_text') {
            const modal = new ModalBuilder().setCustomId(`welcome_text_modal`).setTitle('Edit Welcome Message');
            modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('title').setLabel('Title').setStyle(TextInputStyle.Short).setValue(config.titleTemplate).setRequired(true)),
                new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('desc').setLabel('Description').setStyle(TextInputStyle.Paragraph).setValue(config.descriptionTemplate).setRequired(true))
            );
            if (!interaction.isModalSubmit()) await interaction.showModal(modal);
        }
        else if (customId === 'welcome_text_modal') {
            if (interaction.isModalSubmit()) {
                config.titleTemplate = interaction.fields.getTextInputValue('title');
                config.descriptionTemplate = interaction.fields.getTextInputValue('desc');
                await saveConfig(guildId, config);
                await sendStep2(interaction, config);
            }
        }
        else if (customId === 'welcome_toggle_mention') {
            config.mentionUser = !config.mentionUser;
            await saveConfig(guildId, config);
            await sendStep2(interaction, config);
        }
        else if (customId === 'welcome_toggle_thumbnail') {
            config.showThumbnail = !config.showThumbnail;
            await saveConfig(guildId, config);
            await sendStep2(interaction, config);
        }
        else if (customId === 'welcome_set_banner') {
            const modal = new ModalBuilder().setCustomId(`welcome_banner_modal`).setTitle('Set Banner Image');
            modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('url').setLabel('Image URL').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('https://example.com/image.png'))
            );
            if (!interaction.isModalSubmit()) await interaction.showModal(modal);
        }
        else if (customId === 'welcome_banner_modal') {
            if (interaction.isModalSubmit()) {
                const url = interaction.fields.getTextInputValue('url');
                if (url && url.trim().length > 0) {
                    if (url.startsWith('http')) {
                        config.bannerImageUrl = url;
                        await saveConfig(guildId, config);
                    }
                }
                await sendStep2(interaction, config);
            }
        }
        else if (customId === 'welcome_upload_banner') {
            await interaction.reply({ content: '📤 **Please reply with an image attachment to set as the banner. (Times out in 60s)**', ephemeral: true });
            startBannerCollector(interaction, guildId, config);
        }
        else if (customId === 'welcome_next:step3') {
            await sendStep3(interaction, config);
        }
        else if (customId === 'welcome_back:step2') {
            await sendStep2(interaction, config);
        }
        else if (customId === 'welcome_toggle_autodelete') {
            config.autoDelete = !config.autoDelete;
            await saveConfig(guildId, config);
            await sendStep3(interaction, config);
        }
        else if (customId === 'welcome_set_timer') {
            const modal = new ModalBuilder().setCustomId(`welcome_timer_modal`).setTitle('Auto-Delete Timer');
            modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('seconds').setLabel('Seconds to wait').setStyle(TextInputStyle.Short).setValue(config.deleteAfterSeconds.toString()).setRequired(true))
            );
            if (!interaction.isModalSubmit()) await interaction.showModal(modal);
        }
        else if (customId === 'welcome_timer_modal') {
            if (interaction.isModalSubmit()) {
                const seconds = parseInt(interaction.fields.getTextInputValue('seconds'));
                if (!isNaN(seconds) && seconds > 0) {
                    config.deleteAfterSeconds = seconds;
                    await saveConfig(guildId, config);
                }
                await sendStep3(interaction, config);
            }
        }
        else if (customId === 'welcome_fields') {
            config.fields = values || [];
            await saveConfig(guildId, config);
            await sendStep3(interaction, config);
        }
        else if (customId === 'welcome_finish') {
            if (interaction.isMessageComponent()) {
                await interaction.update({ content: '✅ Auto-Welcome Setup Complete!', embeds: [], components: [] });
            } else if (interaction.isModalSubmit()) {
                await interaction.reply({ content: '✅ Auto-Welcome Setup Complete!', ephemeral: true });
            } else if (interaction.isRepliable()) {
                await interaction.editReply({ content: '✅ Auto-Welcome Setup Complete!', embeds: [], components: [] });
            }
        }

        // Modal Subs (if caught here depending on routing, usually needs global event listener for modals)
        // For simplicity assuming SetupRouter handles modals or we implement a simple workaround if needed.
        // NOTE: Identify strictly by ID logic in handleInteraction of router usually.
    }
};

async function saveConfig(guildId: string, config: WelcomeConfig) {
    await prisma.guildFeature.upsert({
        where: { guildId_featureKey: { guildId, featureKey: KEY } },
        create: { guildId, featureKey: KEY, enabled: config.enabled, config: JSON.stringify(config) },
        update: { enabled: config.enabled, config: JSON.stringify(config) }
    });
}

async function startBannerCollector(interaction: any, guildId: string, config: WelcomeConfig) {
    const channel = interaction.channel;
    if (!channel) return;

    const collector = channel.createMessageCollector({
        filter: (m: any) => m.author.id === interaction.user.id && m.attachments.size > 0,
        max: 1,
        time: 60000
    });

    collector.on('collect', async (m: any) => {
        const attachment = m.attachments.first();
        if (attachment) {
            config.bannerImageUrl = attachment.url;
            await saveConfig(guildId, config);
            await m.delete().catch(() => { });
            await sendStep2(interaction, config);
        }
    });
}

// --- STEPS ---

async function sendStep1(context: SetupContext) {
    // Load fresh to ensure state
    const feature = await prisma.guildFeature.findUnique({ where: { guildId_featureKey: { guildId: context.guildId, featureKey: KEY } } });
    const config = feature ? JSON.parse(feature.config) : { enabled: false };

    const embed = new EmbedBuilder()
        .setTitle('👋 Auto-Welcome Setup')
        .setDescription(`**Status**: ${config.enabled ? '✅ Enabled' : '❌ Disabled'}\n**Channel**: ${config.channelId ? `<#${config.channelId}>` : 'None'}`)
        .setColor(Colors.Blue);

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('welcome_toggle').setLabel(config.enabled ? 'Disable' : 'Enable').setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId('welcome_next:step2').setLabel('Next: Customize').setStyle(ButtonStyle.Primary).setDisabled(!config.channelId)
    );

    const row2 = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
        new ChannelSelectMenuBuilder().setCustomId('welcome_channel').setPlaceholder('Select Welcome Channel').setChannelTypes(ChannelType.GuildText)
    );

    if (context.interaction.isRepliable()) {
        if (context.interaction.isMessageComponent()) await context.interaction.update({ embeds: [embed], components: [row1, row2] });
        else await context.interaction.editReply({ embeds: [embed], components: [row1, row2] });
    }
}

async function sendStep2(interaction: any, config: WelcomeConfig) {
    const embed = new EmbedBuilder()
        .setTitle('🎨 Appearance')
        .setDescription('Customize the look of your welcome embed.')
        .addFields(
            { name: 'Mention User', value: config.mentionUser ? 'Yes' : 'No', inline: true },
            { name: 'Show Thumbnail', value: config.showThumbnail ? 'Yes' : 'No', inline: true },
            { name: 'Banner', value: config.bannerImageUrl ? '[Set]' : 'None', inline: true }
        )
        .setColor(Colors.Blue);

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('welcome_edit_text').setLabel('Edit Title & Desc').setStyle(ButtonStyle.Secondary).setEmoji('📝'),
        new ButtonBuilder().setCustomId('welcome_set_banner').setLabel('Set Banner URL').setStyle(ButtonStyle.Secondary).setEmoji('🔗'),
        new ButtonBuilder().setCustomId('welcome_upload_banner').setLabel('Upload Image').setStyle(ButtonStyle.Secondary).setEmoji('📤')
    );

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('welcome_toggle_mention').setLabel('Toggle User Mention').setStyle(config.mentionUser ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('welcome_toggle_thumbnail').setLabel('Toggle Thumbnail').setStyle(config.showThumbnail ? ButtonStyle.Success : ButtonStyle.Secondary)
    );

    const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('welcome_back:step1').setLabel('Back').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('welcome_next:step3').setLabel('Next: Content & Settings').setStyle(ButtonStyle.Primary)
    );

    try {
        if (interaction.isMessageComponent() || interaction.isModalSubmit()) await interaction.update({ embeds: [embed], components: [row1, row2, row3] });
        else await interaction.editReply({ embeds: [embed], components: [row1, row2, row3] });
    } catch (e) {
        // Fallback if update fails
        if (interaction.editReply) await interaction.editReply({ embeds: [embed], components: [row1, row2, row3] });
    }
}

async function sendStep3(interaction: any, config: WelcomeConfig) {
    const embed = new EmbedBuilder().setTitle('📋 Content & Settings').setDescription('Configure fields and auto-deletion.').setColor(Colors.Blue);

    embed.addFields(
        { name: 'Auto-Delete', value: config.autoDelete ? `Yes (${config.deleteAfterSeconds}s)` : 'No', inline: true }
    );

    const select = new StringSelectMenuBuilder()
        .setCustomId('welcome_fields')
        .setPlaceholder('Select fields to show...')
        .setMinValues(0)
        .setMaxValues(5)
        .addOptions(
            { label: 'Username', value: 'username', default: config.fields?.includes('username') },
            { label: 'User ID', value: 'id', default: config.fields?.includes('id') },
            { label: 'Account Created', value: 'created', default: config.fields?.includes('created') },
            { label: 'Join Date', value: 'joined', default: config.fields?.includes('joined') },
            { label: 'Member Count', value: 'member_count', default: config.fields?.includes('member_count') }
        );

    const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('welcome_toggle_autodelete').setLabel('Toggle Auto-Delete').setStyle(config.autoDelete ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('welcome_set_timer').setLabel('Set Timer').setStyle(ButtonStyle.Secondary).setDisabled(!config.autoDelete)
    );

    const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('welcome_back:step2').setLabel('Back').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('welcome_finish').setLabel('Finish').setStyle(ButtonStyle.Success)
    );

    if (interaction.isMessageComponent() || interaction.isModalSubmit()) await interaction.update({ embeds: [embed], components: [row1, row2, row3] });
    else await interaction.editReply({ embeds: [embed], components: [row1, row2, row3] });
}
