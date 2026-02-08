import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Command } from './command.interface';
import { ModerationService } from '../services/moderation.service';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout (mute) a user')
        .addUserOption(option =>
            option.setName('target').setDescription('The user to timeout').setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('duration').setDescription('Duration in minutes').setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason').setDescription('Reason for the timeout').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    execute: async (interaction: ChatInputCommandInteraction) => {
        const targetUser = interaction.options.getUser('target', true);
        const duration = interaction.options.getInteger('duration', true);
        const reason = interaction.options.getString('reason') || 'No reason provided';

        const member = interaction.guild?.members.cache.get(targetUser.id);
        const moderator = interaction.member;

        if (!member || !moderator) {
            await interaction.reply({ content: 'Could not resolve member or moderator.', ephemeral: true });
            return;
        }

        if (!member.moderatable) {
            await interaction.reply({ content: 'I cannot timeout this user (missing permissions or role hierarchy).', ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        const success = await ModerationService.timeout(moderator as any, member, duration, reason);

        if (success) {
            await interaction.editReply({ content: `Timed out ${targetUser.tag} for ${duration} minutes. Reason: ${reason}` });
        } else {
            await interaction.editReply({ content: `Failed to timeout ${targetUser.tag}.` });
        }
    },
};

export default command;
