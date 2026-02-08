import { SlashCommandBuilder, ChatInputCommandInteraction, User } from 'discord.js';
import { Command } from './command.interface';
import { StatsService } from '../services/stats.service';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('rep')
        .setDescription('Give a reputation point to a helpful user')
        .addUserOption(opt => opt.setName('user').setDescription('User to thank').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for the reputation').setRequired(false)),

    execute: async (interaction: ChatInputCommandInteraction) => {
        const target = interaction.options.getMember('user') as any; // Cast to Member
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const member = interaction.member as any;

        if (!target) {
            await interaction.reply({ content: 'User not found.', ephemeral: true });
            return;
        }

        if (target.id === member.id) {
            await interaction.reply({ content: 'You cannot give reputation to yourself!', ephemeral: true });
            return;
        }

        await interaction.deferReply();

        const success = await StatsService.addReputation(target, member, reason);

        if (success) {
            await interaction.editReply(`🌟 **${member.user.tag}** gave reputation to **${target.user.tag}**!\nReason: ${reason}`);
        } else {
            await interaction.editReply({ content: 'Failed to give reputation (Target might be a bot).' });
        }
    },
};

export default command;
