import path from 'path';
import { episodeService } from './episode.service.js';
import { rssService } from './rss.service.js';
import { metadataService } from './metadata.service.js';
import { tomlService } from './toml.service.js';
import { getFileProvider } from '../providers/index.js';
import { env } from '../config/env.js';
import type { Episode } from '@podsync-ui/shared';

export interface OrphanedResult {
  orphaned: Episode[];
  totalOnDisk: number;
  totalInRss: number;
  message?: string;
}

export interface UnavailableResult {
  unavailable: Episode[];
  unchecked: number;
  totalOnDisk: number;
  totalInRss: number;
}

export interface GlobalOrphanedResult extends Omit<OrphanedResult, 'message'> {
  feedErrors: { feedId: string; message: string }[];
}

export interface DeleteResult {
  deleted: number;
  errors: string[];
  total: number;
}

function getBaseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, '');
}

async function getConfiguredFeedIds(): Promise<string[]> {
  const config = await tomlService.read();
  return Object.keys(config.feeds || {});
}

export async function findOrphanedEpisodes(feedId: string): Promise<OrphanedResult> {
  const [episodeList, rssFeed] = await Promise.all([
    episodeService.listEpisodes(feedId, 1, 10000),
    rssService.fetchFeedXml(feedId).catch(() => null),
  ]);

  if (!rssFeed) {
    return {
      orphaned: [],
      message: 'Could not fetch RSS feed to compare',
      totalOnDisk: episodeList.episodes.length,
      totalInRss: 0,
    };
  }

  const rssGuids = new Set(rssFeed.episodes.map((ep) => ep.guid));
  const orphaned = episodeList.episodes.filter((ep) => !rssGuids.has(getBaseName(ep.filename)));

  return {
    orphaned,
    totalOnDisk: episodeList.episodes.length,
    totalInRss: rssFeed.episodes.length,
  };
}

export async function findUnavailableEpisodes(feedId: string): Promise<UnavailableResult> {
  const [episodeList, rssFeed] = await Promise.all([
    episodeService.listEpisodes(feedId, 1, 10000),
    rssService.fetchFeedXml(feedId).catch(() => null),
  ]);

  const rssGuids = new Set(
    rssFeed ? rssFeed.episodes.map((ep) => ep.guid) : [],
  );

  const allBaseNames = episodeList.episodes.map((ep) => getBaseName(ep.filename));
  const metadataMap = await metadataService.getMany(allBaseNames);

  const unavailable = episodeList.episodes.filter((ep) => {
    const baseName = getBaseName(ep.filename);
    if (rssGuids.has(baseName)) return false;
    const meta = metadataMap.get(baseName);
    if (!meta) return false;
    return !meta.title;
  });

  const unchecked = episodeList.episodes.filter((ep) => {
    const baseName = getBaseName(ep.filename);
    return !rssGuids.has(baseName) && !metadataMap.has(baseName);
  }).length;

  return {
    unavailable,
    unchecked,
    totalOnDisk: episodeList.episodes.length,
    totalInRss: rssFeed ? rssFeed.episodes.length : 0,
  };
}

async function deleteEpisodeFiles(feedId: string, episodes: Episode[]): Promise<DeleteResult> {
  const files = getFileProvider();
  let deleted = 0;
  const errors: string[] = [];

  for (const ep of episodes) {
    try {
      await files.deleteFile(path.join(env.podsyncDataDir, feedId, ep.filename));
      deleted++;
    } catch (err: any) {
      errors.push(`${ep.filename}: ${err.message}`);
    }
  }

  return { deleted, errors, total: episodes.length };
}

export async function deleteOrphanedEpisodes(feedId: string): Promise<DeleteResult> {
  const result = await findOrphanedEpisodes(feedId);
  if (result.message) {
    return { deleted: 0, errors: [result.message], total: 0 };
  }
  return deleteEpisodeFiles(feedId, result.orphaned);
}

export async function deleteUnavailableEpisodes(feedId: string): Promise<DeleteResult> {
  const result = await findUnavailableEpisodes(feedId);
  return deleteEpisodeFiles(feedId, result.unavailable);
}

export async function findAllOrphanedEpisodes(): Promise<GlobalOrphanedResult> {
  const feedIds = await getConfiguredFeedIds();
  const results = await Promise.all(
    feedIds.map(async (feedId) => ({ feedId, ...(await findOrphanedEpisodes(feedId)) })),
  );

  const feedErrors = results
    .filter((r) => r.message)
    .map((r) => ({ feedId: r.feedId, message: r.message! }));

  return {
    orphaned: results.flatMap((r) => r.orphaned),
    totalOnDisk: results.reduce((sum, r) => sum + r.totalOnDisk, 0),
    totalInRss: results.reduce((sum, r) => sum + r.totalInRss, 0),
    feedErrors,
  };
}

export async function findAllUnavailableEpisodes(): Promise<UnavailableResult> {
  const feedIds = await getConfiguredFeedIds();
  const results = await Promise.all(feedIds.map((feedId) => findUnavailableEpisodes(feedId)));

  return {
    unavailable: results.flatMap((r) => r.unavailable),
    unchecked: results.reduce((sum, r) => sum + r.unchecked, 0),
    totalOnDisk: results.reduce((sum, r) => sum + r.totalOnDisk, 0),
    totalInRss: results.reduce((sum, r) => sum + r.totalInRss, 0),
  };
}

async function deleteAcrossFeeds(
  deleteFn: (feedId: string) => Promise<DeleteResult>,
): Promise<DeleteResult> {
  const feedIds = await getConfiguredFeedIds();
  let deleted = 0;
  const errors: string[] = [];
  let total = 0;

  for (const feedId of feedIds) {
    const result = await deleteFn(feedId);
    deleted += result.deleted;
    errors.push(...result.errors.map((err) => `${feedId}/${err}`));
    total += result.total;
  }

  return { deleted, errors, total };
}

export async function deleteAllOrphanedEpisodes(): Promise<DeleteResult> {
  return deleteAcrossFeeds(deleteOrphanedEpisodes);
}

export async function deleteAllUnavailableEpisodes(): Promise<DeleteResult> {
  return deleteAcrossFeeds(deleteUnavailableEpisodes);
}
