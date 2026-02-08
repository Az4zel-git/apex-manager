import { prisma } from '../db';
import { logger } from '../utils/logger';

async function main() {
    logger.info('Starting DB Test...');
    try {
        const dummyId = 'test-' + Date.now();
        const created = await prisma.tempVoiceChannel.create({
            data: {
                channelId: dummyId,
                guildId: 'test-guild',
                ownerId: 'test-owner'
            }
        });
        logger.info('Successfully created dummy channel:', created);

        const fetched = await prisma.tempVoiceChannel.findUnique({
            where: { channelId: dummyId }
        });
        logger.info('Successfully fetched dummy channel:', fetched);

        await prisma.tempVoiceChannel.delete({
            where: { channelId: dummyId }
        });
        logger.info('Successfully deleted dummy channel.');

    } catch (error) {
        logger.error('DB Test Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
