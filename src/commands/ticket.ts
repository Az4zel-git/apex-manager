import { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, TextChannel, Role, EmbedBuilder } from 'discord.js';
import { Command } from './command.interface';
import { TicketPanelService } from '../tickets/panel.service';
import { prisma } from '../db';
import { TicketEditor } from '../tickets/editor';

export const command: Command = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Manage the ticket system')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('panel')
                .setDescription('Open the Interactive Panel Manager')
        )
        .addSubcommand(sub =>
            sub.setName('config')
                .setDescription('Configure general ticket settings')
                .addRoleOption(option =>
                    option.setName('support_role')
                        .setDescription('The role that handles tickets')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('category_id')
                        .setDescription('The ID of the category to create tickets in')
                        .setRequired(false)
                )
        ),

    execute: async (interaction: ChatInputCommandInteraction) => {
        const subcommand = interaction.options.getSubcommand();
        // const group = interaction.options.getSubcommandGroup(); // No groups anymore

        if (subcommand === 'panel') {
            await TicketEditor.sendManager(interaction);
            return;
        }

        if (subcommand === 'config') {
            const role = interaction.options.getRole('support_role') as Role;
            const categoryId = interaction.options.getString('category_id');

            await prisma.ticketConfig.upsert({
                where: { guildId: interaction.guildId! },
                update: {
                    supportRoleId: role.id,
                    categoryId: categoryId || undefined
                },
                create: {
                    guildId: interaction.guildId!,
                    supportRoleId: role.id,
                    categoryId: categoryId
                }
            });

            await interaction.reply({ content: `✅ Ticket configuration updated.\nSupport Role: ${role}\nCategory: ${categoryId || 'None'}`, ephemeral: true });
        }
    }
};
