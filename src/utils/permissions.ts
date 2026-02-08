import { GuildMember, PermissionFlagsBits } from 'discord.js';

export const hasPermission = (member: GuildMember, permission: keyof typeof PermissionFlagsBits): boolean => {
    return member.permissions.has(PermissionFlagsBits[permission]);
};

// TODO: Integrate with roles.yaml config for custom role-based checks
