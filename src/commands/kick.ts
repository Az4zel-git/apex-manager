import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Command } from './command.interface';
import { ModerationService } from '../services/moderation.service';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user')
        .addUserOption(option =>
            option.setName('target').setDescription('The user to kick').setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason').setDescription('Reason for the kick').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    execute: async (interaction: ChatInputCommandInteraction) => {
        const targetUser = interaction.options.getUser('target', true);
        const reason = interaction.options.getString('reason') || 'No reason provided';

        const member = interaction.guild?.members.cache.get(targetUser.id);
        const moderator = interaction.member;

        if (!member || !moderator) {
            await interaction.reply({ content: 'Could not resolve member or moderator.', ephemeral: true });
            return;
        }

        if (!member.kickable) {
            await interaction.reply({ content: 'I cannot kick this user (missing permissions or role hierarchy).', ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        const success = await ModerationService.kick(moderator as any, member, reason);

        if (success) {
            await interaction.editReply({ content: `Kicked ${targetUser.tag} for: ${reason}` });
        } else {
            await interaction.editReply({ content: `Failed to kick ${targetUser.tag}.` });
        }
    },
};

export default command;
