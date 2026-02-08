import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Colors } from 'discord.js';
import { Command } from './command.interface';
import { StatsService } from '../services/stats.service';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('View user statistics (Messages, Voice, Rep)')
        .addUserOption(opt => opt.setName('user').setDescription('User to view').setRequired(false)),

    execute: async (interaction: ChatInputCommandInteraction) => {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guildId!;

        const stats = await StatsService.getStats(guildId, targetUser.id);
        const member = await interaction.guild?.members.fetch(targetUser.id);

        const joinedAt = member?.joinedAt ? member.joinedAt.toLocaleDateString() : 'Unknown';
        const daysInServer = member?.joinedAt
            ? Math.floor((Date.now() - member.joinedAt.getTime()) / (1000 * 60 * 60 * 24))
            : 0;

        const embed = new EmbedBuilder()
            .setTitle(`Stats for ${targetUser.tag}`)
            .setColor(Colors.Gold)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: '📅 Tenure', value: `${daysInServer} days\n(Joined: ${joinedAt})`, inline: true },
                { name: '🌟 Reputation', value: `${stats?.reputation || 0}`, inline: true },
                { name: '\u200B', value: '\u200B', inline: true }, // Spacer
                { name: '💬 Messages', value: `Total: ${stats?.messagesTotal || 0}\nWeekly: ${stats?.messagesWeekly || 0}`, inline: true },
                { name: '🎙️ Voice', value: `Total: ${stats?.voiceMinutesTotal || 0}m\nWeekly: ${stats?.voiceMinutesWeekly || 0}m`, inline: true }
            );

        await interaction.reply({ embeds: [embed] });
    },
};

export default command;
