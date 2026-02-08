import { SetupModule } from './setup.types';
import { Collection } from 'discord.js';

export class SetupRegistry {
    private modules: Collection<string, SetupModule> = new Collection();

    register(module: SetupModule) {
        this.modules.set(module.key, module);
    }

    get(key: string): SetupModule | undefined {
        return this.modules.get(key);
    }

    getAll(): SetupModule[] {
        return Array.from(this.modules.values());
    }
}

import { welcomeModule } from './modules/welcome.setup';
import { serverStatsModule } from './modules/server-stats.setup';

export const setupRegistry = new SetupRegistry();
setupRegistry.register(welcomeModule);
setupRegistry.register(serverStatsModule);
