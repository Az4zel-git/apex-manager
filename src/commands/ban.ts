import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Command } from './command.interface';
import { ModerationService } from '../services/moderation.service';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server')
        .addUserOption(option =>
            option.setName('target').setDescription('The user to ban').setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason').setDescription('Reason for the ban').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    execute: async (interaction: ChatInputCommandInteraction) => {
        const targetUser = interaction.options.getUser('target', true);
        const reason = interaction.options.getString('reason') || 'No reason provided';

        const member = interaction.guild?.members.cache.get(targetUser.id);
        const moderator = interaction.member;

        if (!member || !moderator) {
            await interaction.reply({ content: 'Could not resolve member or moderator.', ephemeral: true });
            return;
        }

        if (!member.bannable) {
            await interaction.reply({ content: 'I cannot ban this user (missing permissions or role hierarchy).', ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        const success = await ModerationService.ban(moderator as any, member, reason);

        if (success) {
            await interaction.editReply({ content: `Banned ${targetUser.tag} for: ${reason}` });
        } else {
            await interaction.editReply({ content: `Failed to ban ${targetUser.tag}.` });
        }
    },
};

export default command;
