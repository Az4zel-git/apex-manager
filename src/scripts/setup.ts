import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

const ENV_PATH = path.join(process.cwd(), '.env');

export async function runSetup() {
    console.log('\n--- Server Setup ---\n');

    let currentEnv: Record<string, string> = {};

    if (fs.existsSync(ENV_PATH)) {
        const envConfig = dotenv.parse(fs.readFileSync(ENV_PATH));
        currentEnv = envConfig;

        try {
            const { useExisting } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'useExisting',
                    message: 'Found existing .env configuration. Do you want to use these credentials?',
                    default: true
                }
            ]);

            if (useExisting) {
                logger.info('Using existing configuration.');
                return;
            }
        } catch (error) {
            // If prompt fails (e.g. non-interactive), assume yes if env exists
            logger.warn('Could not prompt for setup (non-interactive environment?). Using existing .env if valid.');
            return;
        }
    }

    const questions = [
        {
            type: 'input',
            name: 'DISCORD_TOKEN',
            message: 'Enter your Discord Bot Token (Developer Portal -> Bot -> Token):',
            default: currentEnv.DISCORD_TOKEN,
            validate: (input: string) => input.trim() !== '' || 'Token is required'
        },
        {
            type: 'input',
            name: 'CLIENT_ID',
            message: 'Enter your Client/Application ID (Developer Portal -> General Information):',
            default: currentEnv.CLIENT_ID,
            validate: (input: string) => input.trim() !== '' || 'Client ID is required'
        },
        {
            type: 'input',
            name: 'DATABASE_URL',
            message: 'Enter Database URL (default: SQLite file:./dev.db):',
            default: currentEnv.DATABASE_URL || 'file:./dev.db'
        }
    ];

    try {
        const answers = await inquirer.prompt(questions);

        // Merge with other existing env vars if any, or just strictly minimal?
        // Let's preserve other keys from currentEnv if we didn't ask for them.
        const newEnv = { ...currentEnv, ...answers };

        // Ensure standard defaults
        if (!newEnv.NODE_ENV) newEnv.NODE_ENV = 'development';
        if (!newEnv.LOG_LEVEL) newEnv.LOG_LEVEL = 'info';

        const envContent = Object.entries(newEnv)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        fs.writeFileSync(ENV_PATH, envContent);
        logger.info('Configuration saved to .env');

        // Update Prisma provider if needed
        if (newEnv.DATABASE_URL) {
            updatePrismaProvider(newEnv.DATABASE_URL);
        }

    } catch (error) {
        logger.error('Error during setup prompt:', error);
        process.exit(1);
    }
}

import { execSync } from 'child_process';

function updatePrismaProvider(databaseUrl: string) {
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');

    if (!fs.existsSync(schemaPath)) {
        logger.warn('prisma/schema.prisma not found. Skipping provider update.');
        return;
    }

    let provider = 'postgresql'; // Default
    if (databaseUrl.startsWith('file:')) provider = 'sqlite';
    else if (databaseUrl.startsWith('mysql:')) provider = 'mysql';
    else if (databaseUrl.startsWith('sqlserver:')) provider = 'sqlserver';
    else if (databaseUrl.startsWith('mongodb:')) provider = 'mongodb';
    else if (databaseUrl.startsWith('cockroachdb:')) provider = 'cockroachdb';

    let schemaContent = fs.readFileSync(schemaPath, 'utf8');

    // Regex to find the provider line in datasource db block
    // Looking for: datasource db { ... provider = "..." ... }
    const providerRegex = /(datasource\s+db\s+\{[\s\S]*?provider\s*=\s*")([^"]+)("[\s\S]*?\})/;

    const match = schemaContent.match(providerRegex);
    if (match && match[2] !== provider) {
        logger.info(`Detected database type: ${provider}. Updating Prisma schema...`);
        schemaContent = schemaContent.replace(providerRegex, `$1${provider}$3`);
        fs.writeFileSync(schemaPath, schemaContent);

        logger.info('Regenerating Prisma client...');
        try {
            execSync('npx prisma generate', { stdio: 'inherit' });
            logger.info('Prisma client regenerated successfully.');
        } catch (error) {
            logger.error('Failed to regenerate Prisma client. Please run "npx prisma generate" manually.', error);
        }
    }
}
