import { FastifyPluginAsync } from 'fastify';
import { tomlService } from '../services/toml.service.js';
import { episodeService } from '../services/episode.service.js';

export const configRoutes: FastifyPluginAsync = async (app) => {
  // Full parsed config (with tokens masked)
  app.get('/config', async () => {
    const config = await tomlService.read();
    // Mask tokens in the response
    if (config.tokens) {
      const masked = { ...config.tokens };
      for (const [key, value] of Object.entries(masked)) {
        if (Array.isArray(value)) {
          (masked as any)[key] = value.map((v: string) =>
            v.length <= 8 ? '****' : v.slice(0, 4) + '****' + v.slice(-4),
          );
        } else if (typeof value === 'string') {
          (masked as any)[key] = value.length <= 8 ? '****' : value.slice(0, 4) + '****' + value.slice(-4);
        }
      }
      config.tokens = masked;
    }
    return config;
  });

  // Raw TOML string
  app.get('/config/raw', async () => {
    const raw = await tomlService.readRaw();
    return { content: raw };
  });

  // Dashboard stats
  app.get('/dashboard', async () => {
    const config = await tomlService.read();
    const feedCount = config.feeds ? Object.keys(config.feeds).length : 0;
    const storageStats = await episodeService.getStorageStats();

    return {
      feedCount,
      totalEpisodes: storageStats.totalFiles,
      totalSizeBytes: storageStats.totalSizeBytes,
    };
  });
};
