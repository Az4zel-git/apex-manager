import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ChannelSelectMenuBuilder,
    ComponentType,
    ChannelType,
    EmbedBuilder,
    Colors,
    Role
} from 'discord.js';
import { Command } from './command.interface';
import { prisma } from '../db';
import { logger } from '../utils/logger';
import { setupRegistry } from '../setup/setup.registry';
import { SetupRouter } from '../setup/setup.router';
import { serverStatsModule } from '../setup/modules/server-stats.setup';
import { generalSetupModule } from '../setup/modules/general.setup';
import { rolesModule } from '../setup/modules/roles.setup';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Interactive setup for bot configuration')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    execute: async (interaction: ChatInputCommandInteraction) => {
        const guildId = interaction.guildId;
        if (!guildId) return;

        // Register Modules (Ideally done at startup, but here works for now)
        // We import them here to ensure they are registered
        setupRegistry.register(generalSetupModule);
        setupRegistry.register(rolesModule);
        setupRegistry.register(serverStatsModule);

        // Start Router
        await SetupRouter.start(interaction);

        // Get the reply message to attach collector
        let response;
        try {
            response = await interaction.fetchReply();
        } catch (e) {
            return; // Failed to fetch
        }

        const collector = response.createMessageComponentCollector({
            time: 600000 // 10 minutes
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                await i.reply({ content: 'This menu is not for you.', ephemeral: true });
                return;
            }

            try {
                await SetupRouter.handleInteraction({ guildId, interaction: i });
            } catch (error) {
                logger.error('Setup interaction error:', error);
                if (i.isRepliable() && !i.replied && !i.deferred) {
                    await i.reply({ content: 'An error occurred.', ephemeral: true });
                }
            }
        });

        collector.on('end', async () => {
            try {
                // Remove components on timeout
                await interaction.editReply({ components: [] });
            } catch (e) { }
        });
    },
};

export default command;
