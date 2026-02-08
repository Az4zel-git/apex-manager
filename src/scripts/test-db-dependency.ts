import { prisma } from '../db';

async function main() {
    const guildId = 'test-guild-' + Date.now();
    console.log(`Checking DB dependency for guild: ${guildId}`);

    // 1. Ensure no GuildConfig exists
    const config = await prisma.guildConfig.findUnique({ where: { guildId } });
    if (config) {
        console.log('GuildConfig already exists (unexpected for random ID)');
        return;
    }
    console.log('Confirmed no GuildConfig exists.');

    // 2. Try to create GuildFeature
    try {
        await prisma.guildFeature.create({
            data: {
                guildId: guildId,
                featureKey: 'test_feature',
                config: JSON.stringify({ enabled: true }),
                enabled: true
            }
        });
        console.log('SUCCESS: GuildFeature created without GuildConfig!');
    } catch (e) {
        console.error('FAILED: Could not create GuildFeature:', e);
    } finally {
        // Cleanup
        try {
            await prisma.guildFeature.delete({
                where: { guildId_featureKey: { guildId, featureKey: 'test_feature' } }
            });
            console.log('Cleanup complete.');
        } catch (e) { }
    }
}

main().catch(console.error).finally(async () => {
    await prisma.$disconnect();
});
