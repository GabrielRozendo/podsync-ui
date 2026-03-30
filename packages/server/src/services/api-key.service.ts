import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { env } from '../config/env.js';
import type { ApiKey, ApiKeyScope, ApiKeyCreateResponse } from '@podsync-ui/shared';

interface ApiKeyStore {
  id: string;
  name: string;
  prefix: string;
  keyHash: string;
  scopes: ApiKeyScope[];
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revoked: boolean;
}

interface ApiKeysFile {
  keys: ApiKeyStore[];
}

const SALT_ROUNDS = 10;
const KEY_PREFIX = 'psk_';

class ApiKeyService {
  private configPath: string;

  constructor() {
    this.configPath = path.join(env.sidecarConfigDir, 'api-keys.json');
  }

  private async readStore(): Promise<ApiKeysFile> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return { keys: [] };
    }
  }

  private async writeStore(store: ApiKeysFile): Promise<void> {
    await fs.mkdir(path.dirname(this.configPath), { recursive: true });
    await fs.writeFile(this.configPath, JSON.stringify(store, null, 2), 'utf-8');
  }

  private generateKey(): string {
    return KEY_PREFIX + crypto.randomBytes(24).toString('hex');
  }

  private toPublic(store: ApiKeyStore): ApiKey {
    return {
      id: store.id,
      name: store.name,
      prefix: store.prefix,
      scopes: store.scopes,
      createdAt: store.createdAt,
      expiresAt: store.expiresAt,
      lastUsedAt: store.lastUsedAt,
      revoked: store.revoked,
    };
  }

  async listKeys(): Promise<ApiKey[]> {
    const store = await this.readStore();
    return store.keys.map((k) => this.toPublic(k));
  }

  async createKey(
    name: string,
    scopes: ApiKeyScope[],
    expiresInDays?: number | null,
  ): Promise<ApiKeyCreateResponse> {
    const store = await this.readStore();
    const rawKey = this.generateKey();
    const keyHash = await bcrypt.hash(rawKey, SALT_ROUNDS);
    const now = new Date().toISOString();

    const record: ApiKeyStore = {
      id: crypto.randomUUID(),
      name,
      prefix: rawKey.slice(0, 12),
      keyHash,
      scopes,
      createdAt: now,
      expiresAt: expiresInDays
        ? new Date(Date.now() + expiresInDays * 86400 * 1000).toISOString()
        : null,
      lastUsedAt: null,
      revoked: false,
    };

    store.keys.push(record);
    await this.writeStore(store);

    return {
      key: rawKey,
      apiKey: this.toPublic(record),
    };
  }

  async revokeKey(id: string): Promise<ApiKey | null> {
    const store = await this.readStore();
    const key = store.keys.find((k) => k.id === id);
    if (!key) return null;
    key.revoked = true;
    await this.writeStore(store);
    return this.toPublic(key);
  }

  async deleteKey(id: string): Promise<boolean> {
    const store = await this.readStore();
    const idx = store.keys.findIndex((k) => k.id === id);
    if (idx === -1) return false;
    store.keys.splice(idx, 1);
    await this.writeStore(store);
    return true;
  }

  async validateKey(rawKey: string): Promise<{ valid: boolean; scopes: ApiKeyScope[] }> {
    if (!rawKey.startsWith(KEY_PREFIX)) {
      return { valid: false, scopes: [] };
    }

    const store = await this.readStore();
    const now = new Date();

    for (const key of store.keys) {
      if (key.revoked) continue;
      if (key.expiresAt && new Date(key.expiresAt) < now) continue;

      const match = await bcrypt.compare(rawKey, key.keyHash);
      if (match) {
        key.lastUsedAt = now.toISOString();
        await this.writeStore(store);
        return { valid: true, scopes: key.scopes };
      }
    }

    return { valid: false, scopes: [] };
  }
}

export const apiKeyService = new ApiKeyService();
