import { GuildMember, PermissionFlagsBits } from 'discord.js';

export class PermissionsGuard {
    static isAdmin(member: GuildMember): boolean {
        return member.permissions.has(PermissionFlagsBits.Administrator);
    }

    static canManageTickets(member: GuildMember): boolean {
        return member.permissions.has(PermissionFlagsBits.ManageMessages); // Or specific role check
    }

    static isJunior(member: GuildMember): boolean {
        // Logic to check specific roles. 
        // For now, assume anyone with ManageMessages but not Admin is Mod.
        // Junior logic might need config from DB.
        return false;
    }
}
