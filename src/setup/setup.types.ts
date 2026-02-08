import { ChatInputCommandInteraction, StringSelectMenuInteraction, ChannelSelectMenuInteraction, ModalSubmitInteraction, ButtonInteraction } from 'discord.js';

export interface SetupContext {
    guildId: string;
    interaction: ChatInputCommandInteraction | StringSelectMenuInteraction | ChannelSelectMenuInteraction | ModalSubmitInteraction | ButtonInteraction;
}

export interface SetupModule {
    key: string;            // 'server_stats', 'verification'
    label: string;          // Display name in menu
    description: string;    // Description in menu
    emoji?: string;         // Emoji for the menu option

    // Returns the initial entry point for this module's setup
    getInitialStep(context: SetupContext): Promise<any>;

    // Handle interactions specific to this module
    handleInteraction(context: SetupContext, customId: string, values?: string[]): Promise<void>;
}

export interface SetupStep {
    type: 'embed' | 'menu' | 'modal';
    content?: string;
    // ... potentially more complex structure but keeping it simple for now
}
