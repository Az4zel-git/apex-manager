import { EmbedBuilder, PermissionResolvable } from 'discord.js';

export interface HelpSection {
    title: string;
    content: string;
}

export interface HelpPage {
    id: string; // unique key e.g. 'moderation', 'tickets'
    title: string;
    description: string;
    emoji: string;
    sections: HelpSection[];
    requiredPermissions?: PermissionResolvable[];
    adminOnly?: boolean;
}
