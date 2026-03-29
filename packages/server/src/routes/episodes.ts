import path from 'path';
import { FastifyPluginAsync } from 'fastify';
import { episodeService } from '../services/episode.service.js';
import { rssService } from '../services/rss.service.js';
import { metadataService } from '../services/metadata.service.js';
import { getFileProvider } from '../providers/index.js';
import { env } from '../config/env.js';

function isSafePath(base: string, ...segments: string[]): boolean {
  const resolved = path.resolve(base, ...segments);
  return resolved.startsWith(path.resolve(base) + path.sep);
}

export const episodeRoutes: FastifyPluginAsync = async (app) => {
  // List episodes with RSS enrichment
  // Supports sorting via query: sort=size|date|pubDate, order=asc|desc
  app.get<{
    Params: { id: string };
    Querystring: { page?: string; pageSize?: string; sort?: string; order?: string };
  }>('/feeds/:id/episodes', async (request) => {
    const { id } = request.params;
    const page = parseInt(request.query.page || '1', 10);
    const pageSize = parseInt(request.query.pageSize || '50', 10);
    const sort = request.query.sort || 'date';
    const order = request.query.order || 'desc';

    // Get all episodes (unpaginated, no duration probing) so we can sort with RSS data
    const episodeList = await episodeService.listEpisodes(id, 1, 10000, { probeDuration: false });
    const rssFeed = await rssService.fetchFeedXml(id).catch(() => null);

    // Build guid-to-RSS map
    const rssMap = new Map<string, any>();
    if (rssFeed) {
      for (const ep of rssFeed.episodes) {
        rssMap.set(ep.guid, ep);
      }
    }

    // Get all video IDs for metadata lookup
    const allBaseNames = episodeList.episodes.map((ep) => ep.filename.replace(/\.[^.]+$/, ''));
    const metadataMap = await metadataService.getMany(allBaseNames);

    // Find episodes missing both RSS and cached metadata — queue for background fetch
    // Sort newest first so recent episodes get metadata before historical ones
    const episodesByBaseName = new Map(
      episodeList.episodes.map((ep) => [ep.filename.replace(/\.[^.]+$/, ''), ep]),
    );
    const missingMetadata = allBaseNames
      .filter((id) => !rssMap.has(id) && !metadataMap.has(id))
      .sort((a, b) => {
        const aTime = new Date(episodesByBaseName.get(a)!.modifiedAt).getTime();
        const bTime = new Date(episodesByBaseName.get(b)!.modifiedAt).getTime();
        return bTime - aTime; // newest first
      });
    if (missingMetadata.length > 0) {
      metadataService.queueFetch(missingMetadata);
    }

    // Enrich all episodes (RSS first, then yt-dlp cache fallback)
    const enriched = episodeList.episodes.map((ep) => {
      const baseName = ep.filename.replace(/\.[^.]+$/, '');
      const rssEp = rssMap.get(baseName);
      const ytMeta = metadataMap.get(baseName);
      const youtubeUrl = `https://www.youtube.com/watch?v=${baseName}`;

      return {
        ...ep,
        title: rssEp?.title || ytMeta?.title || undefined,
        description: rssEp?.description || ytMeta?.description || undefined,
        episodeLink: rssEp?.link || (ytMeta ? youtubeUrl : undefined),
        thumbnailUrl: rssEp?.imageUrl || ytMeta?.thumbnailUrl || undefined,
        pubDate: rssEp?.pubDate || ytMeta?.uploadDate || undefined,
        inRss: rssMap.has(baseName),
        metadataSource: rssEp ? 'rss' : ytMeta?.title ? 'ytdlp' : 'none',
      };
    });

    // Sort
    const dir = order === 'asc' ? 1 : -1;
    enriched.sort((a, b) => {
      switch (sort) {
        case 'size':
          return (a.fileSizeBytes - b.fileSizeBytes) * dir;
        case 'pubDate': {
          const aDate = a.pubDate ? new Date(a.pubDate).getTime() : 0;
          const bDate = b.pubDate ? new Date(b.pubDate).getTime() : 0;
          return (aDate - bDate) * dir;
        }
        case 'title': {
          const aTitle = (a.title || a.filename).toLowerCase();
          const bTitle = (b.title || b.filename).toLowerCase();
          return aTitle.localeCompare(bTitle) * dir;
        }
        case 'date':
        default:
          return (new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime()) * dir;
      }
    });

    // Paginate
    const total = enriched.length;
    const start = (page - 1) * pageSize;
    const episodes = enriched.slice(start, start + pageSize);

    // Probe durations only for the current page (local mode only)
    if (env.mode === 'local') {
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      const AUDIO_FORMATS = new Set(['mp3', 'm4a', 'ogg', 'opus', 'flac', 'wav', 'aac']);
      for (const ep of episodes) {
        if (AUDIO_FORMATS.has(ep.format)) {
          try {
            const mm: any = require('music-metadata');
            const fullPath = path.join(env.podsyncDataDir, id, ep.filename);
            const metadata = await mm.parseFile(fullPath);
            ep.duration = metadata.format.duration;
          } catch {
            // Duration unavailable
          }
        }
      }
    }

    return {
      episodes,
      total,
      page,
      pageSize,
      feedTitle: rssFeed?.title,
      feedImageUrl: rssFeed?.imageUrl,
    };
  });

  // Delete single episode
  app.delete<{
    Params: { id: string; filename: string };
  }>('/feeds/:id/episodes/:filename', async (request, reply) => {
    const { id, filename } = request.params;
    if (!isSafePath(env.podsyncDataDir, id, filename)) {
      return reply.status(400).send({ message: 'Invalid path' });
    }
    const filePath = path.join(env.podsyncDataDir, id, filename);
    const files = getFileProvider();

    const exists = await files.exists(filePath);
    if (!exists) {
      return reply.status(404).send({ message: 'Episode not found' });
    }

    await files.deleteFile(filePath);
    return { message: `Episode '${filename}' deleted` };
  });

  // Bulk delete episodes
  app.post<{
    Params: { id: string };
    Body: { filenames: string[] };
  }>('/feeds/:id/episodes/bulk-delete', async (request, reply) => {
    const { id } = request.params;
    const { filenames } = request.body;

    if (!filenames?.length) {
      return reply.status(400).send({ message: 'No filenames provided' });
    }

    const files = getFileProvider();
    let deleted = 0;
    const errors: string[] = [];

    for (const filename of filenames) {
      if (!isSafePath(env.podsyncDataDir, id, filename)) {
        errors.push(filename);
        continue;
      }
      const filePath = path.join(env.podsyncDataDir, id, filename);
      try {
        await files.deleteFile(filePath);
        deleted++;
      } catch {
        errors.push(filename);
      }
    }

    return { deleted, errors, total: filenames.length };
  });

  // Cleanup: delete episodes older than X days
  app.post<{
    Params: { id: string };
    Body: { olderThanDays: number };
  }>('/feeds/:id/episodes/cleanup/age', async (request, reply) => {
    const { id } = request.params;
    const { olderThanDays } = request.body;

    if (!olderThanDays || olderThanDays < 1) {
      return reply.status(400).send({ message: 'olderThanDays must be >= 1' });
    }

    const cutoff = new Date(Date.now() - olderThanDays * 86400 * 1000);
    if (!isSafePath(env.podsyncDataDir, id)) {
      return reply.status(400).send({ message: 'Invalid path' });
    }
    const episodeList = await episodeService.listEpisodes(id, 1, 10000);
    const files = getFileProvider();

    const toDelete = episodeList.episodes.filter(
      (ep) => new Date(ep.modifiedAt) < cutoff,
    );

    let deleted = 0;
    const errors: string[] = [];
    for (const ep of toDelete) {
      try {
        await files.deleteFile(path.join(env.podsyncDataDir, id, ep.filename));
        deleted++;
      } catch (err: any) {
        errors.push(`${ep.filename}: ${err.message}`);
      }
    }

    return { deleted, errors, total: episodeList.episodes.length };
  });

  // Cleanup: keep only last N episodes (by download date, newest kept)
  app.post<{
    Params: { id: string };
    Body: { keepLast: number };
  }>('/feeds/:id/episodes/cleanup/keep-last', async (request, reply) => {
    const { id } = request.params;
    const { keepLast } = request.body;

    if (!keepLast || keepLast < 1) {
      return reply.status(400).send({ message: 'keepLast must be >= 1' });
    }

    if (!isSafePath(env.podsyncDataDir, id)) {
      return reply.status(400).send({ message: 'Invalid path' });
    }
    const episodeList = await episodeService.listEpisodes(id, 1, 10000);
    // Already sorted newest first by default
    const sorted = [...episodeList.episodes].sort(
      (a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(),
    );

    const toDelete = sorted.slice(keepLast);
    const files = getFileProvider();

    let deleted = 0;
    const errors: string[] = [];
    for (const ep of toDelete) {
      try {
        await files.deleteFile(path.join(env.podsyncDataDir, id, ep.filename));
        deleted++;
      } catch (err: any) {
        errors.push(`${ep.filename}: ${err.message}`);
      }
    }

    return { deleted, errors, kept: Math.min(keepLast, sorted.length), total: sorted.length };
  });

  // Find orphaned episodes (on disk but not in RSS)
  app.get<{
    Params: { id: string };
  }>('/feeds/:id/episodes/orphaned', async (request) => {
    const { id } = request.params;

    const [episodeList, rssFeed] = await Promise.all([
      episodeService.listEpisodes(id, 1, 10000),
      rssService.fetchFeedXml(id).catch(() => null),
    ]);

    if (!rssFeed) {
      return { orphaned: [], message: 'Could not fetch RSS feed to compare' };
    }

    const rssGuids = new Set(rssFeed.episodes.map((ep) => ep.guid));

    const orphaned = episodeList.episodes.filter((ep) => {
      const baseName = ep.filename.replace(/\.[^.]+$/, '');
      return !rssGuids.has(baseName);
    });

    return {
      orphaned,
      totalOnDisk: episodeList.episodes.length,
      totalInRss: rssFeed.episodes.length,
    };
  });

  // Metadata cache status
  app.get('/metadata/status', async () => {
    return metadataService.getStatus();
  });

  // Force re-fetch metadata for a specific episode
  app.post<{
    Params: { videoId: string };
  }>('/metadata/:videoId/refetch', async (request, reply) => {
    const { videoId } = request.params;
    const result = await metadataService.refetch(videoId);
    if (!result || !result.title) {
      return reply.status(502).send({ message: 'yt-dlp failed to fetch metadata', metadata: result });
    }
    return result;
  });
};
