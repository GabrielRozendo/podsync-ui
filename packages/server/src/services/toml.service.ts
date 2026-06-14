import { createRequire } from 'module';
import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env.js';
import { getFileProvider } from '../providers/index.js';
import type { PodsyncConfig } from '@podsync-ui/shared';

const require = createRequire(import.meta.url);
const TOML = require('toml-patch');

class TomlService {
  private get configPath() {
    return env.podsyncConfigPath;
  }

  private get files() {
    return getFileProvider();
  }

  async readRaw(): Promise<string> {
    try {
      return await this.files.readFile(this.configPath);
    } catch (err: any) {
      if (err.code === 'ENOENT' || err.message?.includes('No such file')) {
        console.warn(`[toml] Config file not found at "${this.configPath}" — returning empty config`);
        return '';
      }
      throw err;
    }
  }

  async read(): Promise<PodsyncConfig> {
    const raw = await this.readRaw();
    if (!raw) return {};
    return TOML.parse(raw) as PodsyncConfig;
  }

  private async backup(): Promise<void> {
    if (!env.tomlBackupEnabled) return;
    const content = await this.readRaw();
    if (!content) return;
    const dir = path.join(env.sidecarConfigDir, 'backups');
    await fs.mkdir(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/:/g, '-').replace('T', '_').slice(0, 19);
    const dest = path.join(dir, `config-${stamp}.toml`);
    await fs.writeFile(dest, content, 'utf-8');
    console.info(`[toml] Backup saved: ${dest}`);
  }

  private async writeFromRaw(raw: string, config: PodsyncConfig): Promise<void> {
    await this.backup();
    const tomlString = raw
      ? TOML.patch(raw, config)
      : TOML.stringify(config);
    await this.files.writeFile(this.configPath, tomlString);
  }

  async write(config: PodsyncConfig): Promise<void> {
    const raw = await this.readRaw();
    await this.writeFromRaw(raw, config);
  }

  async updateSection<K extends keyof PodsyncConfig>(
    section: K,
    value: PodsyncConfig[K],
  ): Promise<PodsyncConfig> {
    const raw = await this.readRaw();
    const config = raw ? (TOML.parse(raw) as PodsyncConfig) : {};
    if (value === undefined || value === null) {
      delete config[section];
    } else {
      (config as any)[section] = value;
    }
    await this.writeFromRaw(raw, config);
    return config;
  }

  async getFeed(feedId: string) {
    const config = await this.read();
    return config.feeds?.[feedId];
  }

  async setFeed(feedId: string, feed: any): Promise<PodsyncConfig> {
    const raw = await this.readRaw();
    const config = raw ? (TOML.parse(raw) as PodsyncConfig) : {};
    if (!config.feeds) config.feeds = {};
    config.feeds[feedId] = feed;
    await this.writeFromRaw(raw, config);
    return config;
  }

  async deleteFeed(feedId: string): Promise<PodsyncConfig> {
    const raw = await this.readRaw();
    const config = raw ? (TOML.parse(raw) as PodsyncConfig) : {};
    if (config.feeds) {
      delete config.feeds[feedId];
    }
    await this.writeFromRaw(raw, config);
    return config;
  }

  async getConfigMtime(): Promise<Date | null> {
    const stat = await this.files.stat(this.configPath);
    return stat ? stat.mtime : null;
  }
}

export const tomlService = new TomlService();
