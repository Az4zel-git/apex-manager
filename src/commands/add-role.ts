import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, GuildMember, Role } from 'discord.js';
import { Command } from './command.interface';
import { logger } from '../utils/logger';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('addrole')
        .setDescription('Add a role to a user')
        .addUserOption(option =>
            option.setName('target').setDescription('The user to assign the role to').setRequired(true)
        )
        .addRoleOption(option =>
            option.setName('role').setDescription('The role to assign').setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    execute: async (interaction: ChatInputCommandInteraction) => {
        const targetUser = interaction.options.getUser('target', true);
        const role = interaction.options.getRole('role', true) as Role;

        const guild = interaction.guild;
        if (!guild) return;

        const member = guild.members.cache.get(targetUser.id);
        const moderator = interaction.member as GuildMember;

        if (!member) {
            await interaction.reply({ content: 'Could not resolve member.', ephemeral: true });
            return;
        }

        // Check if role is managed (e.g. bot integration role)
        if (role.managed) {
            await interaction.reply({ content: 'Cannot assign managed roles (e.g. bot integration roles).', ephemeral: true });
            return;
        }

        // Hierarchy Check: Bot vs Role
        const botMember = guild.members.me;
        if (botMember && role.position >= botMember.roles.highest.position) {
            await interaction.reply({ content: 'I cannot assign this role because it is higher than or equal to my highest role.', ephemeral: true });
            return;
        }

        // Hierarchy Check: Moderator vs Role
        if (role.position >= moderator.roles.highest.position && interaction.user.id !== guild.ownerId) {
            await interaction.reply({ content: 'You cannot assign a role that is higher than or equal to your own highest role.', ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            await member.roles.add(role);
            logger.info({
                event: 'role_add',
                guildId: guild.id,
                moderatorId: interaction.user.id,
                targetId: member.id,
                roleId: role.id,
                roleName: role.name
            });
            await interaction.editReply({ content: `✅ Added permission role **${role.name}** to ${targetUser.tag}.` });
        } catch (error) {
            logger.error('Failed to add role', error);
            await interaction.editReply({ content: `❌ Failed to add role: ${(error as Error).message}` });
        }
    },
};

export default command;
