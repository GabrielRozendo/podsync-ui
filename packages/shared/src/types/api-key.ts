export type ApiKeyScope =
  | 'config:read'
  | 'config:write'
  | 'feeds:read'
  | 'feeds:write'
  | 'episodes:read'
  | 'episodes:write'
  | 'tokens:read'
  | 'tokens:write'
  | 'settings:read'
  | 'settings:write'
  | 'docker:read'
  | 'docker:write'
  | 'auth:read'
  | 'auth:write'
  | 'admin';

export const API_KEY_SCOPES: ApiKeyScope[] = [
  'config:read',
  'config:write',
  'feeds:read',
  'feeds:write',
  'episodes:read',
  'episodes:write',
  'tokens:read',
  'tokens:write',
  'settings:read',
  'settings:write',
  'docker:read',
  'docker:write',
  'auth:read',
  'auth:write',
  'admin',
];

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: ApiKeyScope[];
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revoked: boolean;
}

export interface ApiKeyCreateRequest {
  name: string;
  scopes: ApiKeyScope[];
  expiresInDays?: number | null;
}

export interface ApiKeyCreateResponse {
  key: string;
  apiKey: ApiKey;
}
