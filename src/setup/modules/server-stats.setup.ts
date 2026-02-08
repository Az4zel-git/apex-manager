import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder, Colors, ChannelType } from 'discord.js';
import { SetupContext, SetupModule } from '../setup.types';
import { SetupRouter } from '../setup.router';
import { prisma } from '../../db';
import { ServerStatsService } from '../../services/server-stats.service';
import { logger } from '../../utils/logger';

const KEY = 'server_stats';

interface StatsConfig {
    enabled: boolean;
    channelType: 'voice' | 'text';
    stats: string[];
    categoryId?: string;
    namingTemplate?: Record<string, string>;
    channelIds?: Record<string, string>;
}

export const serverStatsModule: SetupModule = {
    key: KEY,
    label: 'Live Server Statistics',
    description: 'Show live member, online, and staff counts.',
    emoji: '📊',

    getInitialStep: async (context: SetupContext) => {
        return sendStep1(context);
    },

    handleInteraction: async (context: SetupContext, customId: string, values?: string[]) => {
        try {
            const { interaction } = context;
            logger.info(`[ServerStats] Handling interaction: ${customId}`);

            if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isChannelSelectMenu()) return;

            // Load current config state (mocked or from DB)
            // For this flow, we might need a temporary state or just read from DB and modify.
            // We'll use the DB as the source of truth for simplicity, or pass state in customIds (limited size).
            // Let's assume we read from DB.

            const guildId = context.guildId;
            const feature = await prisma.guildFeature.findUnique({
                where: { guildId_featureKey: { guildId, featureKey: KEY } }
            });

            let config: StatsConfig = feature ? JSON.parse(feature.config) : { enabled: false, channelType: 'voice', stats: [] };

            // Ensure defaults if missing from DB
            if (!config.stats) config.stats = [];
            if (!config.channelType) config.channelType = 'voice';
            if (!config.channelIds) config.channelIds = {};

            logger.info(`[ServerStats] Loaded config: ${JSON.stringify(config)}`);

            if (customId.startsWith('server_stats_toggle')) {
                const action = values?.[0] || (interaction as any).customId.split(':').pop(); // Handle button if logic changes
                logger.info(`[ServerStats] Toggle action: ${action}`);

                if (action === 'enable') config.enabled = true;
                if (action === 'disable') config.enabled = false;

                await saveConfig(guildId, config);
                logger.info(`[ServerStats] Config saved.`);

                if (!config.enabled) {
                    await interaction.update({ content: 'Live Statistics have been disabled.', components: [], embeds: [] });
                    // Trigger cleanup immediately
                    await ServerStatsService.triggerBackgroundUpdate(interaction.client, guildId);
                    return;
                }
                // Go to Step 2
                logger.info(`[ServerStats] Sending Step 2`);
                await sendStep2(interaction, config);
            }
            else if (customId === 'server_stats_back:step1') {
                await SetupRouter.sendMainMenu(interaction);
            }
            else if (customId === 'server_stats_back:step2') {
                await sendStep1(context);
            }
            else if (customId === 'server_stats_back:step3') {
                await sendStep2(interaction, config);
            }
            else if (customId === 'server_stats_back:step4') {
                await sendStep3(interaction, config);
            }
            else if (customId === 'server_stats_back:step5') {
                await sendStep4(interaction, config);
            }
            else if (customId.startsWith('server_stats_channel_type')) {
                // Button click for Voice or Text
                const type = (interaction as any).customId.split(':').pop();
                config.channelType = type;
                await saveConfig(guildId, config);
                await sendStep3(interaction, config);
            }
            else if (customId === 'server_stats_next:step3') {
                if (!config.stats || config.stats.length === 0) {
                    await interaction.reply({ content: '❌ Please select at least one statistic.', ephemeral: true });
                    return;
                }
                await sendStep4(interaction, config);
            }
            else if (customId === 'server_stats_next:step4') {
                if (!config.categoryId) {
                    await interaction.reply({ content: '❌ Please select a category.', ephemeral: true });
                    return;
                }
                await sendStep5(interaction, config);
            }
            else if (customId === 'server_stats_select_metrics') {
                config.stats = values || [];
                await saveConfig(guildId, config);
                // Just update the menu to show selection, don't advance
                await sendStep3(interaction, config);
            }
            else if (customId === 'server_stats_select_category') {
                const selected = values?.[0];
                if (selected === 'create_new') {
                    config.categoryId = 'NEW';
                } else {
                    config.categoryId = selected;
                }
                await saveConfig(guildId, config);
                // Stay on step 4
                await sendStep4(interaction, config);
            }
            else if (customId === 'server_stats_confirm') {
                await interaction.update({ content: 'Setting up statistics channels...', components: [], embeds: [] });

                // Trigger runtime logic
                await ServerStatsService.triggerBackgroundUpdate(interaction.client, guildId);
                await ServerStatsService.triggerOnlineUpdate(interaction.client, guildId, true);

                await interaction.editReply({ content: '✅ Live Server Statistics setup complete!', components: [] });
            }
        } catch (error) {
            logger.error('[ServerStats] Error in handleInteraction:', error);
            throw error;
        }
    }
};

async function saveConfig(guildId: string, config: StatsConfig) {
    await prisma.guildFeature.upsert({
        where: { guildId_featureKey: { guildId, featureKey: KEY } },
        create: {
            guildId,
            featureKey: KEY,
            enabled: config.enabled,
            config: JSON.stringify(config)
        },
        update: {
            enabled: config.enabled,
            config: JSON.stringify(config)
        }
    });
}

// Step 1: Enable/Disable
async function sendStep1(context: SetupContext) {
    const feature = await prisma.guildFeature.findUnique({
        where: { guildId_featureKey: { guildId: context.guildId, featureKey: KEY } }
    });
    const config: StatsConfig = feature ? JSON.parse(feature.config) : { enabled: false, channelType: 'voice', stats: [] };
    if (!config.stats) config.stats = [];
    if (!config.channelType) config.channelType = 'voice';
    const isEnabled = config.enabled;

    const embed = new EmbedBuilder()
        .setTitle('📊 Live Server Statistics')
        .setDescription('Enable or disable live counter channels for your server.')
        .setColor(Colors.Blue);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('server_stats_toggle:enable')
            .setLabel(isEnabled ? 'Configure' : 'Enable')
            .setStyle(isEnabled ? ButtonStyle.Primary : ButtonStyle.Success)
            .setDisabled(false), // Always enabled to allow editing
        new ButtonBuilder()
            .setCustomId('server_stats_toggle:disable')
            .setLabel(isEnabled ? 'Disable' : 'Disabled') // Changed label logic slightly for clarity
            .setStyle(isEnabled ? ButtonStyle.Danger : ButtonStyle.Secondary)
            .setDisabled(!isEnabled),
        new ButtonBuilder().setCustomId('server_stats_back:step1').setLabel('Back').setStyle(ButtonStyle.Secondary).setEmoji('🔙')
    );

    if (context.interaction.isRepliable()) {
        if (context.interaction.isMessageComponent()) {
            await context.interaction.update({ embeds: [embed], components: [row] });
        } else {
            await context.interaction.editReply({ embeds: [embed], components: [row] });
        }
    }
}

// Step 2: Channel Type
async function sendStep2(interaction: any, config: StatsConfig) {
    const embed = new EmbedBuilder()
        .setTitle('Step 2: Channel Type')
        .setDescription('Choose the type of channels to display statistics.\n**Voice Channels** are recommended for better aesthetics.')
        .setColor(Colors.Blue);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('server_stats_channel_type:voice').setLabel('Voice Channels').setEmoji('🔊').setStyle(config.channelType === 'voice' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('server_stats_channel_type:text').setLabel('Text Channels').setEmoji('📝').setStyle(config.channelType === 'text' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('server_stats_back:step2').setLabel('Back').setStyle(ButtonStyle.Secondary).setEmoji('🔙')
    );

    await interaction.update({ embeds: [embed], components: [row] });
}

// Step 3: Metrics
async function sendStep3(interaction: any, config: StatsConfig) {
    const embed = new EmbedBuilder()
        .setTitle('Step 3: Select Statistics')
        .setDescription('Choose which statistics you want to display.')
        .setColor(Colors.Blue);

    const select = new StringSelectMenuBuilder()
        .setCustomId('server_stats_select_metrics')
        .setPlaceholder('Select stats...')
        .setMinValues(1)
        .setMaxValues(4)
        .addOptions(
            { label: 'Total Members', value: 'members', emoji: '👥', default: config.stats.includes('members') },
            { label: 'Online Members', value: 'online', emoji: '🟢', default: config.stats.includes('online') },
            { label: 'Staff Online', value: 'staff_online', emoji: '🛡️', default: config.stats.includes('staff_online') },
            { label: 'Bot Count', value: 'bots', emoji: '🤖', default: config.stats.includes('bots') }
        );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
    const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('server_stats_back:step3').setLabel('Back').setStyle(ButtonStyle.Secondary).setEmoji('🔙'),
        new ButtonBuilder().setCustomId('server_stats_next:step3').setLabel('Next').setStyle(ButtonStyle.Primary).setEmoji('➡️')
    );

    await interaction.update({ embeds: [embed], components: [row, backRow] });
}

// Step 4: Category
async function sendStep4(interaction: any, config: StatsConfig) {
    const embed = new EmbedBuilder()
        .setTitle('Step 4: Category')
        .setDescription('Where should these channels be created?')
        .setColor(Colors.Blue);

    // Fetch guild categories
    const guild = interaction.guild;
    const categories = guild ? guild.channels.cache.filter((c: any) => c.type === ChannelType.GuildCategory) : [];

    // Sort by position
    const sortedCategories = categories.sort((a: any, b: any) => a.position - b.position);

    // Create options (max 25 total)
    // Always have "Create New" first
    const options = [
        new StringSelectMenuOptionBuilder()
            .setLabel('Create New Category')
            .setValue('create_new')
            .setEmoji('✨')
            .setDescription('Creates "📊 Server Statistics" at the top')
            .setDefault(config.categoryId === 'NEW')
    ];

    // Add existing (upto 24)
    for (const cat of sortedCategories.values()) {
        if (options.length >= 25) break;
        options.push(
            new StringSelectMenuOptionBuilder()
                .setLabel(cat.name.substring(0, 100))
                .setValue(cat.id)
                .setEmoji('📂')
                .setDefault(config.categoryId === cat.id)
        );
    }

    const select = new StringSelectMenuBuilder()
        .setCustomId('server_stats_select_category')
        .setPlaceholder('Select a category...')
        .addOptions(options);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
    const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('server_stats_back:step4').setLabel('Back').setStyle(ButtonStyle.Secondary).setEmoji('🔙'),
        new ButtonBuilder().setCustomId('server_stats_next:step4').setLabel('Next').setStyle(ButtonStyle.Primary).setEmoji('➡️')
    );

    await interaction.update({ embeds: [embed], components: [row, backRow] });
}

// Step 5: Preview
async function sendStep5(interaction: any, config: StatsConfig) {
    const lines = config.stats.map(s => {
        if (s === 'members') return '👥 Members: 14,487';
        if (s === 'online') return '🟢 Online: 1,137';
        if (s === 'staff_online') return '🛡️ Staff Online: 5';
        if (s === 'bots') return '🤖 Bots: 50';
        return s;
    });

    const embed = new EmbedBuilder()
        .setTitle('Step 5: Confirm Setup')
        .setDescription(`Please confirm your settings.\n\n**Category:** ${config.categoryId === 'NEW' ? 'Create New' : 'Existing'}\n**Type:** ${config.channelType}\n\n**Preview:**\n${lines.join('\n')}`)
        .setColor(Colors.Gold);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('server_stats_confirm').setLabel('Confirm & Create').setStyle(ButtonStyle.Success).setEmoji('✅'),
        new ButtonBuilder().setCustomId('server_stats_back:step5').setLabel('Back').setStyle(ButtonStyle.Secondary).setEmoji('🔙')
    );

    await interaction.update({ embeds: [embed], components: [row] });
}
