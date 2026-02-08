import {
    Guild,
    GuildChannel,
    TextChannel,
    VoiceChannel,
    PermissionFlagsBits,
    EmbedBuilder,
    Colors,
    ChannelType,
    OverwriteType,
    CategoryChannel
} from 'discord.js';

export class ChannelService {

    // --- Visualization ---
    static getChannelInfo(channel: GuildChannel) {
        let description = `**Type:** ${ChannelType[channel.type]}\n**ID:** \`${channel.id}\`\n**Parent:** ${channel.parent ? channel.parent.name : 'None'}`;

        const overwrites = channel.permissionOverwrites.cache;

        const allowedRoles: string[] = [];
        const deniedRoles: string[] = [];
        const allowedUsers: string[] = [];
        const deniedUsers: string[] = [];

        overwrites.forEach(overwrite => {
            if (overwrite.type === OverwriteType.Role) {
                if (overwrite.allow.has(PermissionFlagsBits.ViewChannel)) allowedRoles.push(`<@&${overwrite.id}>`);
                if (overwrite.deny.has(PermissionFlagsBits.ViewChannel)) deniedRoles.push(`<@&${overwrite.id}>`);
            } else {
                if (overwrite.allow.has(PermissionFlagsBits.ViewChannel)) allowedUsers.push(`<@${overwrite.id}>`);
                if (overwrite.deny.has(PermissionFlagsBits.ViewChannel)) deniedUsers.push(`<@${overwrite.id}>`);
            }
        });

        const embed = new EmbedBuilder()
            .setTitle(`📺 Channel: ${channel.name}`)
            .setColor(Colors.Blue)
            .setDescription(description)
            .addFields(
                { name: '✅ Allowed Roles', value: allowedRoles.length ? allowedRoles.join(', ') : 'None (Inherit/Default)', inline: true },
                { name: '❌ Denied Roles', value: deniedRoles.length ? deniedRoles.join(', ') : 'None', inline: true },
                { name: '\u200B', value: '\u200B', inline: false },
                { name: '👤 Allowed Users', value: allowedUsers.length ? allowedUsers.join(', ') : 'None', inline: true },
                { name: '🚫 Denied Users', value: deniedUsers.length ? deniedUsers.join(', ') : 'None', inline: true }
            );

        return embed;
    }

    // --- Actions ---

    static async cloneChannel(channel: GuildChannel, newName?: string) {
        // Only Text and Voice are supported for simple cloning in this context
        if (channel instanceof TextChannel || channel instanceof VoiceChannel) {
            return await channel.clone({
                name: newName || `${channel.name}-copy`,
                reason: 'Admin cloned via /channel'
            });
        }
        throw new Error('Unsupported channel type for cloning.');
    }

    static async syncChannel(channel: GuildChannel) {
        if (!channel.parent) throw new Error('Channel has no category (parent) to sync with.');

        await channel.lockPermissions();
        return true;
    }

    static async applyTemplate(channel: GuildChannel, templateType: string) {
        const guild = channel.guild;
        const everyone = guild.roles.everyone;

        if (templateType === 'private') {
            await channel.permissionOverwrites.edit(everyone, { ViewChannel: false });
        } else if (templateType === 'public') {
            await channel.permissionOverwrites.edit(everyone, { ViewChannel: true, SendMessages: true, Connect: true });
        } else if (templateType === 'read_only') {
            await channel.permissionOverwrites.edit(everyone, { ViewChannel: true, SendMessages: false, Connect: false });
        } else {
            throw new Error('Unknown template type.');
        }
    }

    // --- Audit ---

    static async auditPermissions(guild: Guild) {
        await guild.members.fetch();
        await guild.roles.fetch();

        const dangerousAdmins: string[] = [];
        const dangerousManagers: string[] = [];

        guild.members.cache.each(member => {
            if (member.permissions.has(PermissionFlagsBits.Administrator)) {
                if (!member.user.bot) dangerousAdmins.push(`${member.user.tag} (User)`);
            } else if (member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                if (!member.user.bot) dangerousManagers.push(`${member.user.tag} (User)`);
            }
        });

        guild.roles.cache.each(role => {
            if (role.permissions.has(PermissionFlagsBits.Administrator)) {
                dangerousAdmins.push(`${role.name} (Role)`);
            } else if (role.permissions.has(PermissionFlagsBits.ManageGuild)) {
                dangerousManagers.push(`${role.name} (Role)`);
            }
        });

        const embed = new EmbedBuilder()
            .setTitle('🛡️ Security Audit')
            .setColor(Colors.Red)
            .setDescription('Listing entities with high-risk permissions.')
            .addFields(
                { name: '🚨 Administrator Permission', value: dangerousAdmins.length ? dangerousAdmins.join('\n') : 'None' },
                { name: '⚠️ Manage Server Permission', value: dangerousManagers.length ? dangerousManagers.join('\n') : 'None' }
            );

        return embed;
    }
}
