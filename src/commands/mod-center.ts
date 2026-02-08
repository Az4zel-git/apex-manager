import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { DashboardController } from '../mod-center/dashboard.controller';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient(); // TODO: Use shared instance
const controller = new DashboardController(prisma);

export const command = {
    data: new SlashCommandBuilder()
        .setName('mod')
        .setDescription('Mod Control Center commands')
        .addSubcommand(sub =>
            sub.setName('center')
                .setDescription('Open the Mod Control Center')
        )
        .addSubcommand(sub =>
            sub.setName('assign')
                .setDescription('Manually assign a ticket')
                .addIntegerOption(opt => opt.setName('ticket').setDescription('Ticket ID').setRequired(true))
                .addUserOption(opt => opt.setName('mod').setDescription('Moderator').setRequired(true))
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'center') {
            await controller.showDashboard(interaction);
        } else if (subcommand === 'assign') {
            // TODO: Implement manual assignment logic here or in controller
            await interaction.reply({ content: 'Manual assignment not yet wired.', ephemeral: true });
        }
    },
};
