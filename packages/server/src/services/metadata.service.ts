import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env.js';

const execFileAsync = promisify(execFile);

export interface VideoMetadata {
  videoId: string;
  title: string;
  description: string;
  uploadDate: string;
  duration: number;
  thumbnailUrl: string;
  channelName: string;
  fetchedAt: string;
}

interface MetadataCache {
  [videoId: string]: VideoMetadata;
}

class MetadataService {
  private cache: MetadataCache = {};
  private cacheLoaded = false;
  private cachePath: string;
  private fetchQueue: Set<string> = new Set();
  private fetching = false;
  private updateTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cachePath = path.join(env.sidecarConfigDir, 'metadata-cache.json');
  }

  private async loadCache(): Promise<void> {
    if (this.cacheLoaded) return;
    try {
      const data = await fs.readFile(this.cachePath, 'utf-8');
      this.cache = JSON.parse(data);
    } catch {
      this.cache = {};
    }
    this.cacheLoaded = true;
  }

  private async saveCache(): Promise<void> {
    await fs.mkdir(path.dirname(this.cachePath), { recursive: true });
    await fs.writeFile(this.cachePath, JSON.stringify(this.cache, null, 2), 'utf-8');
  }

  async get(videoId: string): Promise<VideoMetadata | null> {
    await this.loadCache();
    return this.cache[videoId] || null;
  }

  async getMany(videoIds: string[]): Promise<Map<string, VideoMetadata>> {
    await this.loadCache();
    const result = new Map<string, VideoMetadata>();
    for (const id of videoIds) {
      if (this.cache[id]) {
        result.set(id, this.cache[id]);
      }
    }
    return result;
  }

  // Queue video IDs for background fetching
  queueFetch(videoIds: string[]): void {
    for (const id of videoIds) {
      if (!this.cache[id] && id.length > 0) {
        this.fetchQueue.add(id);
      }
    }
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.fetching || this.fetchQueue.size === 0) return;
    this.fetching = true;

    const batch = Array.from(this.fetchQueue).slice(0, 5); // Process 5 at a time
    for (const id of batch) {
      this.fetchQueue.delete(id);
    }

    try {
      await Promise.all(batch.map((id) => this.fetchOne(id)));
      await this.saveCache();
    } catch {
      // Continue processing remaining items
    }

    this.fetching = false;

    // Continue if more in queue
    if (this.fetchQueue.size > 0) {
      setTimeout(() => this.processQueue(), 1000);
    }
  }

  private async fetchOne(videoId: string): Promise<void> {
    if (this.cache[videoId]) return;

    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      const { stdout } = await execFileAsync('yt-dlp', [
        '--dump-json',
        '--no-download',
        '--no-warnings',
        '--no-playlist',
        url,
      ], { timeout: 30000 });

      const json = JSON.parse(stdout);

      this.cache[videoId] = {
        videoId,
        title: json.title || '',
        description: json.description || '',
        uploadDate: json.upload_date
          ? `${json.upload_date.slice(0, 4)}-${json.upload_date.slice(4, 6)}-${json.upload_date.slice(6, 8)}`
          : '',
        duration: json.duration || 0,
        thumbnailUrl: json.thumbnail || '',
        channelName: json.channel || json.uploader || '',
        fetchedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      console.error(`[metadata] yt-dlp failed for ${videoId}: ${err.message}`);
      if (err.stderr) console.error(`[metadata] stderr: ${err.stderr}`);
      // Store a minimal entry so we don't retry constantly
      this.cache[videoId] = {
        videoId,
        title: '',
        description: '',
        uploadDate: '',
        duration: 0,
        thumbnailUrl: '',
        channelName: '',
        fetchedAt: new Date().toISOString(),
      };
    }
  }

  // Auto-update yt-dlp periodically (every 24h)
  startAutoUpdate(): void {
    this.updateYtDlp(); // Update on startup
    this.updateTimer = setInterval(() => this.updateYtDlp(), 24 * 60 * 60 * 1000);
  }

  stopAutoUpdate(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  private async updateYtDlp(): Promise<void> {
    try {
      await execFileAsync('yt-dlp', ['--update'], { timeout: 60000 });
    } catch {
      // yt-dlp update failed — not critical, may not have pip write access
      try {
        await execFileAsync('pip3', ['install', '--upgrade', '--break-system-packages', 'yt-dlp'], { timeout: 60000 });
      } catch {
        // Best effort
      }
    }
  }

  // Force re-fetch metadata for a specific video, clearing any cached entry
  async refetch(videoId: string): Promise<VideoMetadata | null> {
    await this.loadCache();
    delete this.cache[videoId];
    await this.fetchOne(videoId);
    await this.saveCache();
    return this.cache[videoId] || null;
  }

  // Get queue status for the UI
  getStatus(): { cached: number; queued: number; fetching: boolean } {
    return {
      cached: Object.keys(this.cache).length,
      queued: this.fetchQueue.size,
      fetching: this.fetching,
    };
  }
}

export const metadataService = new MetadataService();
