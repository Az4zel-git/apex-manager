import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType, GuildChannel } from 'discord.js';
import { Command } from './command.interface';
import { ChannelService } from '../services/channel.service';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('channel')
        .setDescription('Advanced channel management dashboard')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('info')
                .setDescription('Visualizes channel permissions')
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel to check').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('clone')
                .setDescription('Clone a channel')
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel to clone').setRequired(true))
                .addStringOption(opt => opt.setName('name').setDescription('New name').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('sync')
                .setDescription('Sync channel permissions with category')
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel to sync').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('template')
                .setDescription('Apply a permission template')
                .addChannelOption(opt => opt.setName('channel').setDescription('Target channel').setRequired(true))
                .addStringOption(opt =>
                    opt.setName('type')
                        .setDescription('Template type')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Public (Everyone can see/send)', value: 'public' },
                            { name: 'Private (Hidden from everyone)', value: 'private' },
                            { name: 'Read Only (Everyone can see, no one can send)', value: 'read_only' }
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('audit')
                .setDescription('Audit dangerous permissions (Admin/Manage Server)')
        ),

    execute: async (interaction: ChatInputCommandInteraction) => {
        const subcommand = interaction.options.getSubcommand();
        const channel = interaction.options.getChannel('channel') as GuildChannel; // Cast usually safe with required option

        await interaction.deferReply({ ephemeral: true });

        try {
            if (subcommand === 'info') {
                const embed = ChannelService.getChannelInfo(channel);
                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'clone') {
                const newName = interaction.options.getString('name') || undefined;
                const newChannel = await ChannelService.cloneChannel(channel, newName);
                await interaction.editReply(`✅ Cloned **${channel.name}** to ${newChannel.toString()}!`);

            } else if (subcommand === 'sync') {
                if (!channel.parent) {
                    await interaction.editReply('❌ Channel has no category to sync with.');
                    return;
                }
                await ChannelService.syncChannel(channel);
                await interaction.editReply(`✅ Synced permissions for **${channel.name}** with category **${channel.parent.name}**.`);

            } else if (subcommand === 'template') {
                const type = interaction.options.getString('type', true);
                await ChannelService.applyTemplate(channel, type);
                await interaction.editReply(`✅ Applied **${type}** template to **${channel.name}**.`);

            } else if (subcommand === 'audit') {
                // Audit is guild-wide, not channel specific
                const embed = await ChannelService.auditPermissions(interaction.guild!);
                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error: any) {
            await interaction.editReply(`❌ Error: ${error.message || 'Unknown error occurred.'}`);
        }
    },
};

export default command;
