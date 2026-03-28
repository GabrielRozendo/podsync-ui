import { createRequire } from 'module';
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

  async write(config: PodsyncConfig): Promise<void> {
    const raw = await this.readRaw();
    let tomlString: string;

    if (raw) {
      tomlString = TOML.patch(raw, config);
    } else {
      tomlString = TOML.stringify(config);
    }

    await this.files.writeFile(this.configPath, tomlString);
  }

  async updateSection<K extends keyof PodsyncConfig>(
    section: K,
    value: PodsyncConfig[K],
  ): Promise<PodsyncConfig> {
    const config = await this.read();
    if (value === undefined || value === null) {
      delete config[section];
    } else {
      (config as any)[section] = value;
    }
    await this.write(config);
    return config;
  }

  async getFeed(feedId: string) {
    const config = await this.read();
    return config.feeds?.[feedId];
  }

  async setFeed(feedId: string, feed: any): Promise<PodsyncConfig> {
    const config = await this.read();
    if (!config.feeds) config.feeds = {};
    config.feeds[feedId] = feed;
    await this.write(config);
    return config;
  }

  async deleteFeed(feedId: string): Promise<PodsyncConfig> {
    const config = await this.read();
    if (config.feeds) {
      delete config.feeds[feedId];
    }
    await this.write(config);
    return config;
  }

  async getConfigMtime(): Promise<Date | null> {
    const stat = await this.files.stat(this.configPath);
    return stat ? stat.mtime : null;
  }
}

export const tomlService = new TomlService();
