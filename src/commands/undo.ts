import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Command } from './command.interface';
import { prisma } from '../db';
import { ModerationService } from '../services/moderation.service';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('undo')
        .setDescription('Undo a moderation action')
        .addIntegerOption(option =>
            option.setName('caseid').setDescription('The Case ID to undo').setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    execute: async (interaction: ChatInputCommandInteraction) => {
        const caseId = interaction.options.getInteger('caseid', true);

        const logEntry = await prisma.case.findUnique({
            where: { id: caseId }
        });

        if (!logEntry) {
            await interaction.reply({ content: 'Case not found.', ephemeral: true });
            return;
        }

        if (!logEntry.active) {
            await interaction.reply({ content: 'This action has already been undone or is inactive.', ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const guild = interaction.guild;
            if (!guild) return;

            if (logEntry.action === 'BAN') {
                await guild.members.unban(logEntry.targetId, 'Undo Action by Moderator');
            } else if (logEntry.action === 'MUTE') {
                // Logic to unmute (e.g. remove timeout)
                const member = await guild.members.fetch(logEntry.targetId).catch(() => null);
                if (member) {
                    await member.timeout(null, 'Undo Action');
                }
            }
            // Warns are just logged, we can just mark inactive

            await prisma.case.update({
                where: { id: caseId },
                data: { active: false }
            });

            await interaction.editReply({ content: `Successfully undid Case #${caseId} (${logEntry.action}).` });

        } catch (error) {
            await interaction.editReply({ content: `Failed to undo action: ${error}` });
        }
    },
};

export default command;
