import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, Colors } from 'discord.js';
import { Command } from './command.interface';
import { prisma } from '../db';
import { logger } from '../utils/logger';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('autorole')
        .setDescription('Manage auto-role rules')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add a new auto-role rule')
                .addStringOption(opt =>
                    opt.setName('type')
                        .setDescription('Type of requirement')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Tenure (Days)', value: 'TENURE' },
                            { name: 'Messages Count', value: 'MESSAGES' },
                            { name: 'Voice Minutes', value: 'VOICE' },
                            { name: 'Reputation', value: 'REPUTATION' }
                        )
                )
                .addIntegerOption(opt => opt.setName('threshold').setDescription('Amount needed').setRequired(true))
                .addRoleOption(opt => opt.setName('role').setDescription('Role to award').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('List all active auto-role rules')
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove a rule by ID')
                .addIntegerOption(opt => opt.setName('id').setDescription('Rule ID to remove').setRequired(true))
        ),

    execute: async (interaction: ChatInputCommandInteraction) => {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId!;

        await interaction.deferReply({ ephemeral: true });

        try {
            if (subcommand === 'add') {
                const type = interaction.options.getString('type', true);
                const threshold = interaction.options.getInteger('threshold', true);
                const role = interaction.options.getRole('role', true);

                await prisma.autoRoleRule.create({
                    data: {
                        guildId,
                        type,
                        threshold,
                        roleId: role.id
                    }
                });

                await interaction.editReply(`✅ Added rule: Award **${role.name}** for **${threshold}** ${type}.`);

            } else if (subcommand === 'list') {
                const rules = await prisma.autoRoleRule.findMany({ where: { guildId } });

                if (rules.length === 0) {
                    await interaction.editReply('No auto-role rules configured.');
                    return;
                }

                const embed = new EmbedBuilder()
                    .setTitle('Auto-Role Rules')
                    .setColor(Colors.Green);

                const descriptions = rules.map(r =>
                    `**ID ${r.id}**: Type: \`${r.type}\` | Threshold: \`${r.threshold}\` | Role: <@&${r.roleId}>`
                ).join('\n');

                embed.setDescription(descriptions);
                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'remove') {
                const id = interaction.options.getInteger('id', true);

                try {
                    await prisma.autoRoleRule.delete({ where: { id } });
                    await interaction.editReply(`✅ Deleted rule ID ${id}.`);
                } catch (e) {
                    await interaction.editReply(`❌ Could not find rule with ID ${id}.`);
                }
            }
        } catch (error) {
            logger.error('Error in autorole command:', error);
            await interaction.editReply('An error occurred while managing rules.');
        }
    },
};

export default command;
