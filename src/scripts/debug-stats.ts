import { Client, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.join(__dirname, '../../.env') });

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
    ]
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user?.tag}`);

    setTimeout(async () => {
        for (const guild of client.guilds.cache.values()) {
            console.log(`Checking guild: ${guild.name} (${guild.id})`);
            try {
                const members = await guild.members.fetch({ withPresences: true });
                console.log(`Fetched ${members.size} members.`);

                const online = members.filter(m => m.presence?.status === 'online').size;
                const idle = members.filter(m => m.presence?.status === 'idle').size;
                const dnd = members.filter(m => m.presence?.status === 'dnd').size;

                console.log(`Stats: Online=${online}, Idle=${idle}, DND=${dnd}, TotalActive=${online + idle + dnd}`);

                const sample = members.find(m => m.presence?.status === 'online');
                if (sample) console.log(`Sample Online: ${sample.user.tag}`);
            } catch (e) {
                console.error(`Error:`, e);
            }
        }
        process.exit(0);
    }, 5000);
});

client.login(process.env.DISCORD_TOKEN);
