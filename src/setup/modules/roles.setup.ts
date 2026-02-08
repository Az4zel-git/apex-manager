import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, RoleSelectMenuBuilder, Colors, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, RoleSelectMenuInteraction } from 'discord.js';
import { SetupContext, SetupModule } from '../setup.types';
import { prisma } from '../../db';
import { SetupRouter } from '../setup.router';

const KEY = 'roles_permissions';

export const rolesModule: SetupModule = {
    key: KEY,
    label: 'Roles & Permissions',
    description: 'Configure Admin and Moderator roles.',
    emoji: '🛡️',

    getInitialStep: async (context: SetupContext) => {
        return sendMenu(context);
    },

    handleInteraction: async (context: SetupContext, customId: string, values?: string[]) => {
        const { interaction, guildId } = context;

        if (customId === 'roles_back') {
            await SetupRouter.sendMainMenu(interaction);
            return;
        }

        if (customId === 'roles_menu') {
            const selected = values?.[0];
            if (selected === 'back') {
                await SetupRouter.sendMainMenu(interaction);
                return;
            }
            if (selected === 'admin') {
                await sendRoleSelector(interaction, 'admin');
            } else if (selected === 'mod') {
                await sendRoleSelector(interaction, 'mod');
            }
        }
        else if (customId.startsWith('roles_select:')) {
            const type = customId.split(':')[1]; // 'admin' or 'mod'
            const roleIds = values || [];

            // Fetch existing to preserve other fields
            const existing = await prisma.guildConfig.findUnique({ where: { guildId } });

            if (type === 'admin') {
                await prisma.guildConfig.upsert({
                    where: { guildId },
                    update: { adminRoles: JSON.stringify(roleIds) },
                    create: { guildId, adminRoles: JSON.stringify(roleIds), modRoles: '[]', logChannelId: '', generatorChannelId: '' }
                });
            } else {
                await prisma.guildConfig.upsert({
                    where: { guildId },
                    update: { modRoles: JSON.stringify(roleIds) },
                    create: { guildId, modRoles: JSON.stringify(roleIds), adminRoles: '[]', logChannelId: '', generatorChannelId: '' }
                });
            }

            if (interaction.isMessageComponent()) {
                await interaction.update({ content: `✅ **${type === 'admin' ? 'Admin' : 'Moderator'}** roles updated!`, components: [], embeds: [] });
            } else {
                await interaction.editReply({ content: `✅ **${type === 'admin' ? 'Admin' : 'Moderator'}** roles updated!`, components: [], embeds: [] });
            }

            // Brief pause then return to menu? Or just stop.
            // Let's stop to be simple, they can run setup again.
        }
    }
};

async function sendMenu(context: SetupContext) {
    const { interaction, guildId } = context;

    const config = await prisma.guildConfig.findUnique({ where: { guildId } });
    const adminRoles = config?.adminRoles ? JSON.parse(config.adminRoles) : [];
    const modRoles = config?.modRoles ? JSON.parse(config.modRoles) : [];

    // Format role mentions
    const adminMentions = adminRoles.map((id: string) => `<@&${id}>`).join(', ') || 'None';
    const modMentions = modRoles.map((id: string) => `<@&${id}>`).join(', ') || 'None';

    const embed = new EmbedBuilder()
        .setTitle('🛡️ Roles & Permissions')
        .setColor(Colors.Blue)
        .setDescription('Configure which roles have special permissions in the bot.')
        .addFields(
            { name: 'Admin Roles', value: adminMentions, inline: true },
            { name: 'Moderator Roles', value: modMentions, inline: true }
        );

    const select = new StringSelectMenuBuilder()
        .setCustomId('roles_menu')
        .setPlaceholder('Select a role type to edit')
        .addOptions(
            { label: 'Edit Admin Roles', value: 'admin', emoji: '👑' },
            { label: 'Edit Moderator Roles', value: 'mod', emoji: '👮' },
            { label: 'Back', value: 'back', emoji: '🔙' }
        );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
    const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('roles_back').setLabel('Back').setStyle(ButtonStyle.Secondary).setEmoji('🔙')
    );

    if (interaction.isRepliable()) {
        const payload = { embeds: [embed], components: [row, backRow] };
        if (interaction.isMessageComponent()) {
            await interaction.update(payload);
        } else {
            await interaction.editReply(payload);
        }
    }
}

async function sendRoleSelector(interaction: any, type: 'admin' | 'mod') {
    const embed = new EmbedBuilder()
        .setTitle(`Select ${type === 'admin' ? 'Admin' : 'Moderator'} Roles`)
        .setDescription('Choose roles from the list below.')
        .setColor(Colors.Blue);

    const roleSelect = new RoleSelectMenuBuilder()
        .setCustomId(`roles_select:${type}`)
        .setPlaceholder('Select roles...')
        .setMinValues(0)
        .setMaxValues(10);

    const row = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(roleSelect);
    const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('roles_back').setLabel('Back').setStyle(ButtonStyle.Secondary).setEmoji('🔙')
    );

    await interaction.update({ embeds: [embed], components: [row, backRow] });
}
