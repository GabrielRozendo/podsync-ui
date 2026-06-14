import { FastifyPluginAsync } from 'fastify';
import { env } from '../config/env.js';
import { requireScope } from '../middleware/scope.guard.js';

// Cache GitHub release check for 1 hour to avoid rate limits
let _versionCache: { data: Record<string, any>; ts: number } | null = null;
const VERSION_CACHE_TTL = 60 * 60 * 1000;

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', {
    schema: {
      tags: ['System'],
      summary: 'Health check',
      description: 'Returns server health status and version info.',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok'] },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number' },
            version: {
              type: 'object',
              properties: {
                commit: { type: 'string' },
                buildTime: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: {
        commit: env.gitCommit,
        buildTime: env.buildTime,
      },
    };
  });

  app.get('/version/check', {
    schema: { tags: ['System'], summary: 'Check for a newer release on GitHub' },
    preHandler: requireScope('config:read'),
  }, async (request, reply) => {
    if (_versionCache && Date.now() - _versionCache.ts < VERSION_CACHE_TTL) {
      return _versionCache.data;
    }

    try {
      const res = await fetch(
        'https://api.github.com/repos/daleiii/podsync-ui/releases/latest',
        {
          headers: { 'User-Agent': 'podsync-ui-sidecar', Accept: 'application/vnd.github.v3+json' },
          signal: AbortSignal.timeout(5000),
        },
      );

      if (!res.ok) {
        return reply.status(502).send({ hasUpdate: false, error: `GitHub API ${res.status}` });
      }

      const release = await res.json() as { tag_name: string; published_at: string; html_url: string };
      const latestTs = new Date(release.published_at).getTime();
      const buildTs = env.buildTime ? new Date(env.buildTime).getTime() : null;
      const hasUpdate = buildTs != null && !isNaN(buildTs) ? latestTs > buildTs : false;

      const data = {
        current: env.gitCommit,
        buildTime: env.buildTime || null,
        latest: release.tag_name,
        latestPublishedAt: release.published_at,
        hasUpdate,
        releaseUrl: release.html_url,
      };

      _versionCache = { data, ts: Date.now() };
      return data;
    } catch (err: any) {
      request.log.warn({ err: err.message }, 'GitHub version check failed');
      return { hasUpdate: false, error: err.message };
    }
  });
};
