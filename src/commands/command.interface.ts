import {
    CommandInteraction,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder,
    ChatInputCommandInteraction
} from 'discord.js';

export interface Command {
    data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
    // Optional: Add permissions, cooldowns, etc.
    cooldown?: number; // in seconds
    roles?: string[]; // Allowed roles (by name or ID)
}
