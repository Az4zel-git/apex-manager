import { Client, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';
config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
    console.log('Connected Guilds:');
    client.guilds.cache.forEach(guild => {
        console.log(`${guild.name}: ${guild.id}`);
    });
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
