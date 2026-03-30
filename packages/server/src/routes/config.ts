import { FastifyPluginAsync } from 'fastify';
import { tomlService } from '../services/toml.service.js';
import { episodeService } from '../services/episode.service.js';
import { rssService } from '../services/rss.service.js';
import { requireScope } from '../middleware/scope.guard.js';

export const configRoutes: FastifyPluginAsync = async (app) => {
  // Full parsed config (with tokens masked)
  app.get('/config', {
    schema: { tags: ['Config'], summary: 'Get full config (tokens masked)' },
    preHandler: requireScope('config:read'),
  }, async () => {
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
  app.get('/config/raw', {
    schema: { tags: ['Config'], summary: 'Get raw TOML config string' },
    preHandler: requireScope('config:read'),
  }, async () => {
    const raw = await tomlService.readRaw();
    return { content: raw };
  });

  // Dashboard stats
  app.get('/dashboard', {
    schema: { tags: ['Dashboard'], summary: 'Get dashboard stats' },
    preHandler: requireScope('config:read'),
  }, async () => {
    const config = await tomlService.read();
    const feedCount = config.feeds ? Object.keys(config.feeds).length : 0;
    const storageStats = await episodeService.getStorageStats();

    return {
      feedCount,
      totalEpisodes: storageStats.totalFiles,
      totalSizeBytes: storageStats.totalSizeBytes,
    };
  });

  // Per-feed health and storage stats
  app.get('/dashboard/feeds', {
    schema: { tags: ['Dashboard'], summary: 'Get per-feed health and storage stats' },
    preHandler: requireScope('feeds:read'),
  }, async () => {
    const config = await tomlService.read();
    const feeds = config.feeds || {};
    const feedIds = Object.keys(feeds);

    // Fetch RSS data and per-feed storage in parallel
    const [rssResults, perFeedStats] = await Promise.all([
      Promise.all(
        feedIds.map((id) =>
          rssService.fetchFeedXml(id).catch(() => null),
        ),
      ),
      episodeService.getPerFeedStats(),
    ]);

    return feedIds.map((id, i) => {
      const feed = feeds[id];
      const rss = rssResults[i];
      const stats = perFeedStats.get(id);
      const updatePeriod = feed?.cron_schedule || feed?.update_period || null;

      // Determine health: stale if lastBuildDate is older than 2x update period
      let stale = false;
      if (rss?.lastBuildDate && updatePeriod) {
        const lastBuild = new Date(rss.lastBuildDate).getTime();
        const periodMs = parsePeriodMs(updatePeriod);
        if (periodMs && Date.now() - lastBuild > periodMs * 2) {
          stale = true;
        }
      }

      return {
        id,
        title: rss?.title || feed?.custom?.title || id,
        format: feed?.format || 'video',
        updatePeriod,
        lastBuildDate: rss?.lastBuildDate || null,
        episodesInRss: rss?.episodes.length ?? null,
        episodesOnDisk: stats?.fileCount ?? 0,
        sizeBytes: stats?.sizeBytes ?? 0,
        newestEpisode: stats?.newestEpisode ?? null,
        stale,
      };
    });
  });
};

function parsePeriodMs(period: string): number | null {
  // Handle cron-style "@every 12h"
  const everyMatch = period.match(/@every\s+(.+)/);
  const p = everyMatch ? everyMatch[1] : period;

  const match = p.match(/^(\d+)(m|h|d)$/);
  if (!match) return null;
  const val = parseInt(match[1], 10);
  switch (match[2]) {
    case 'm': return val * 60 * 1000;
    case 'h': return val * 3600 * 1000;
    case 'd': return val * 86400 * 1000;
    default: return null;
  }
}
