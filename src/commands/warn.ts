import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Command } from './command.interface';
import { ModerationService } from '../services/moderation.service';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a user')
        .addUserOption(option =>
            option.setName('target').setDescription('The user to warn').setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason').setDescription('Reason for the warning').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    execute: async (interaction: ChatInputCommandInteraction) => {
        const targetUser = interaction.options.getUser('target', true);
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // In a real bot, we'd check if the member is actually in the guild to be warned fully
        const member = interaction.guild?.members.cache.get(targetUser.id);
        const moderator = interaction.member;

        if (!member || !moderator) {
            await interaction.reply({ content: 'Could not resolve member or moderator.', ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        // Using "any" cast for moderator to fit GuildMember if needed, or strict checks
        await ModerationService.warn(moderator as any, member, reason);

        await interaction.editReply({ content: `Warned ${targetUser.tag} for: ${reason}` });
    },
};

export default command;
