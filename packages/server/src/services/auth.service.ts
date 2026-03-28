import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcrypt';
import { env } from '../config/env.js';
import type { AuthConfig } from '@podsync-ui/shared';

interface AuthStore {
  enabled: boolean;
  username: string;
  passwordHash: string;
  sessionSecret: string;
}

const SALT_ROUNDS = 10;

class AuthService {
  private configPath: string;

  constructor() {
    this.configPath = path.join(env.sidecarConfigDir, 'auth.json');
  }

  private async readStore(): Promise<AuthStore> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return {
        enabled: false,
        username: 'admin',
        passwordHash: '',
        sessionSecret: this.generateSecret(),
      };
    }
  }

  private async writeStore(store: AuthStore): Promise<void> {
    await fs.mkdir(path.dirname(this.configPath), { recursive: true });
    await fs.writeFile(this.configPath, JSON.stringify(store, null, 2), 'utf-8');
  }

  private generateSecret(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  async getConfig(): Promise<AuthConfig> {
    const store = await this.readStore();
    return {
      enabled: store.enabled,
      username: store.username || undefined,
    };
  }

  async updateConfig(enabled: boolean, username?: string, password?: string): Promise<AuthConfig> {
    const store = await this.readStore();
    store.enabled = enabled;

    if (username) store.username = username;
    if (password) store.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    if (!store.sessionSecret) {
      store.sessionSecret = this.generateSecret();
    }

    await this.writeStore(store);
    return { enabled: store.enabled, username: store.username };
  }

  async validateCredentials(username: string, password: string): Promise<boolean> {
    const store = await this.readStore();
    if (!store.enabled) return true;
    if (username !== store.username) return false;
    return bcrypt.compare(password, store.passwordHash);
  }

  async isEnabled(): Promise<boolean> {
    const store = await this.readStore();
    return store.enabled;
  }

  async getSessionSecret(): Promise<string> {
    const store = await this.readStore();
    if (!store.sessionSecret) {
      store.sessionSecret = this.generateSecret();
      await this.writeStore(store);
    }
    return store.sessionSecret;
  }
}

export const authService = new AuthService();
