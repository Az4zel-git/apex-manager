import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, UserSelectMenuBuilder, RoleSelectMenuBuilder } from 'discord.js';

export class DashboardUI {
    static getMainEmbed(snapshot: any) {
        return new EmbedBuilder()
            .setTitle('🛡️ Mod Control Center')
            .setColor('#5865F2') // Blurple
            .setDescription('Real-time moderation dashboard. Select an action below.')
            .addFields(
                { name: '🎫 Active Tickets', value: `${snapshot.activeTickets}`, inline: true },
                { name: '👮 Mods Online', value: `${snapshot.modsOnline}`, inline: true },
                { name: '🔥 Burnout Risk', value: snapshot.burnoutRisk, inline: true },
                { name: '📊 System Health', value: '✅ Nominal', inline: true }, // Placeholder
                { name: '⏳ Avg Wait', value: `${snapshot.avgWaitTime}s`, inline: true },
            )
            .setTimestamp();
    }

    static getMainControls() {
        return new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder().setCustomId('mod_btn_tickets').setLabel('Tickets').setStyle(ButtonStyle.Primary).setEmoji('🎫'),
                new ButtonBuilder().setCustomId('mod_btn_mods').setLabel('Moderators').setStyle(ButtonStyle.Secondary).setEmoji('👮'),
                new ButtonBuilder().setCustomId('mod_btn_audit').setLabel('Audit Logs').setStyle(ButtonStyle.Secondary).setEmoji('🧾'),
                new ButtonBuilder().setCustomId('mod_btn_refresh').setLabel('Refresh').setStyle(ButtonStyle.Secondary).setEmoji('🔄'),
                new ButtonBuilder().setCustomId('mod_btn_quit').setLabel('Quit').setStyle(ButtonStyle.Danger).setEmoji('🚪'),
            );
    }

    static getTicketListEmbed(tickets: any[]) {
        const description = tickets.length > 0
            ? tickets.map(t => `**#${t.channelName || t.id}** [${t.claimedBy ? 'CLAIMED' : 'UNCLAIMED'}] ${t.subject} ${t.claimedBy ? `(by <@${t.claimedBy}>)` : ''}`).join('\n')
            : 'No active tickets.';

        return new EmbedBuilder()
            .setTitle('🎫 Active Tickets')
            .setDescription(description)
            .setColor('#00FF00');
    }

    static getModListEmbed(mods: any[]) {
        const description = mods.length > 0
            ? mods.map(m => `**${m.username}**: Risk: ${m.burnoutMetric || 'Low'} | Efficiency: ${m.efficiency || 'N/A'}%`).join('\n')
            : 'No active moderators found.';

        return new EmbedBuilder()
            .setTitle('👮 Moderator Status')
            .setDescription(description)
            .setColor('#F1C40F'); // Gold
    }

    static getAuditLogEmbed(logs: any[]) {
        const description = logs.length > 0
            ? logs.slice(0, 10).map(l => `\`${l.createdAt.toLocaleTimeString()}\` **${l.action}**: ${l.details}`).join('\n')
            : 'No recent audit logs.';

        return new EmbedBuilder()
            .setTitle('🧾 Recent Audit Logs')
            .setDescription(description)
            .setColor('#95A5A6'); // Grey
    }

    static getBackControl() {
        return new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder().setCustomId('mod_btn_back').setLabel('Back to Dashboard').setStyle(ButtonStyle.Secondary).setEmoji('⬅️')
            );
    }

    static getModControls() {
        return new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder().setCustomId('mod_btn_add_mod').setLabel('Add Mod').setStyle(ButtonStyle.Success).setEmoji('➕'),
                new ButtonBuilder().setCustomId('mod_btn_remove_mod').setLabel('Remove Mod').setStyle(ButtonStyle.Danger).setEmoji('➖'),
                new ButtonBuilder().setCustomId('mod_btn_back').setLabel('Back').setStyle(ButtonStyle.Secondary).setEmoji('⬅️')
            );
    }

    static getAddModMenu() {
        return [
            new ActionRowBuilder<UserSelectMenuBuilder>()
                .addComponents(
                    new UserSelectMenuBuilder()
                        .setCustomId('mod_sel_add_user')
                        .setPlaceholder('Select User(s) to Add')
                        .setMaxValues(10)
                ),
            new ActionRowBuilder<RoleSelectMenuBuilder>()
                .addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId('mod_sel_add_role')
                        .setPlaceholder('Select Role(s) to Bulk Add')
                        .setMaxValues(5)
                )
        ];
    }

    static getRemoveModMenu(mods: any[]) {
        const options = mods.slice(0, 25).map(m => ({
            label: m.username || m.userId,
            value: m.userId,
            description: `Efficiency: ${m.efficiency || 'N/A'}%`
        }));

        if (options.length === 0) {
            return null; // Handle empty case in controller
        }

        return new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('mod_sel_remove_user')
                    .setPlaceholder('Select Moderator to Remove')
                    .addOptions(options)
            );
    }
}
