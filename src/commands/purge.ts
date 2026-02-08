import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, TextChannel } from 'discord.js';
import { Command } from './command.interface';
import { ModerationService } from '../services/moderation.service';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete a specific number of messages')
        .addIntegerOption(option =>
            option.setName('amount').setDescription('Number of messages to delete (1-100)').setMinValue(1).setMaxValue(100).setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    execute: async (interaction: ChatInputCommandInteraction) => {
        const amount = interaction.options.getInteger('amount', true);
        const moderator = interaction.member;
        const channel = interaction.channel;

        if (!channel || !(channel instanceof TextChannel)) {
            await interaction.reply({ content: 'This command can only be used in text channels.', ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const count = await ModerationService.purge(moderator as any, channel, amount);
            await interaction.editReply({ content: `Successfully deleted ${count} messages.` });
        } catch (error) {
            await interaction.editReply({ content: `Failed to delete messages. Make sure they are not older than 14 days.` });
        }
    },
};

export default command;
