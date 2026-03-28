import path from 'path';
import { createRequire } from 'module';
import { env } from '../config/env.js';
import { getFileProvider } from '../providers/index.js';
import type { Episode, EpisodeListResponse } from '@podsync-ui/shared';

const require = createRequire(import.meta.url);

const MEDIA_EXTENSIONS = new Set([
  '.mp3', '.mp4', '.m4a', '.webm', '.opus', '.ogg', '.wav', '.aac', '.flac', '.mkv',
]);

class EpisodeService {
  private get dataDir() {
    return env.podsyncDataDir;
  }

  private get files() {
    return getFileProvider();
  }

  async listFeedDirectories(): Promise<string[]> {
    const entries = await this.files.readdir(this.dataDir);
    return entries.filter((e) => e.isDirectory).map((e) => e.name);
  }

  async listEpisodes(
    feedId: string,
    page: number = 1,
    pageSize: number = 50,
  ): Promise<EpisodeListResponse> {
    const feedDir = path.join(this.dataDir, feedId);
    const entries = await this.files.readdir(feedDir);

    const mediaFiles = entries.filter(
      (e) => !e.isDirectory && MEDIA_EXTENSIONS.has(path.extname(e.name).toLowerCase()),
    );

    const allEpisodes: Episode[] = mediaFiles
      .map((f) => ({
        filename: f.name,
        feedId,
        filePath: path.join(feedId, f.name),
        fileSizeBytes: f.size,
        modifiedAt: f.modifiedAt.toISOString(),
        format: path.extname(f.name).slice(1),
      }))
      .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

    const total = allEpisodes.length;
    const start = (page - 1) * pageSize;
    const episodes = allEpisodes.slice(start, start + pageSize);

    // Duration probing only works in local mode (needs file access)
    if (env.mode === 'local') {
      for (const ep of episodes) {
        if (['mp3', 'm4a', 'ogg', 'opus', 'flac', 'wav', 'aac'].includes(ep.format)) {
          try {
            const mm: any = require('music-metadata');
            const fullPath = path.join(this.dataDir, ep.filePath);
            const metadata = await mm.parseFile(fullPath);
            ep.duration = metadata.format.duration;
          } catch {
            // Duration unavailable
          }
        }
      }
    }

    return { episodes, total, page, pageSize };
  }

  async getStorageStats(): Promise<{ totalFiles: number; totalSizeBytes: number }> {
    const dirs = await this.listFeedDirectories();
    let totalFiles = 0;
    let totalSizeBytes = 0;

    for (const dir of dirs) {
      const feedDir = path.join(this.dataDir, dir);
      const entries = await this.files.readdir(feedDir);

      for (const entry of entries) {
        if (!entry.isDirectory && MEDIA_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
          totalFiles++;
          totalSizeBytes += entry.size;
        }
      }
    }

    return { totalFiles, totalSizeBytes };
  }
}

export const episodeService = new EpisodeService();
