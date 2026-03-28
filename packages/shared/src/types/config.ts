export interface PodsyncConfig {
  cleanup?: CleanupConfig;
  server?: ServerConfig;
  storage?: StorageConfig;
  tokens?: TokensConfig;
  feeds?: Record<string, FeedConfig>;
  database?: DatabaseConfig;
  downloader?: DownloaderConfig;
  log?: LogConfig;
}

export interface CleanupConfig {
  keep_last?: number;
}

export interface ServerConfig {
  port?: number;
  hostname?: string;
  bind_address?: string;
  path?: string;
  web_ui?: boolean;
  tls?: boolean;
  certificate_path?: string;
  key_file_path?: string;
  debug_endpoints?: boolean;
  no_index?: boolean;
  no_listing?: boolean;
}

export interface StorageConfig {
  type?: 'local' | 's3';
  local?: StorageLocalConfig;
  s3?: StorageS3Config;
}

export interface StorageLocalConfig {
  data_dir?: string;
}

export interface StorageS3Config {
  endpoint_url?: string;
  region?: string;
  bucket?: string;
  prefix?: string;
}

export interface TokensConfig {
  youtube?: string | string[];
  vimeo?: string | string[];
  soundcloud?: string | string[];
  twitch?: string | string[];
}

export interface FeedConfig {
  url: string;
  page_size?: number;
  update_period?: string;
  quality?: 'high' | 'low';
  format?: 'audio' | 'video' | 'custom';
  custom_format?: CustomFormatConfig;
  playlist_sort?: 'asc' | 'desc';
  max_height?: number;
  opml?: boolean;
  cron_schedule?: string;
  clean?: CleanupConfig;
  filters?: FeedFiltersConfig;
  youtube_dl_args?: string[];
  filename_template?: string;
  private_feed?: boolean;
  post_episode_download?: HookConfig[];
  on_episode_download_error?: HookConfig[];
  custom?: FeedCustomConfig;
}

export interface CustomFormatConfig {
  youtube_dl_format: string;
  extension: string;
}

export interface FeedFiltersConfig {
  title?: string;
  not_title?: string;
  description?: string;
  not_description?: string;
  min_duration?: number;
  max_duration?: number;
  max_age?: number;
  min_age?: number;
}

export interface HookConfig {
  command: string[];
  timeout?: number;
}

export interface FeedCustomConfig {
  title?: string;
  description?: string;
  author?: string;
  cover_art?: string;
  cover_art_quality?: 'high' | 'low';
  category?: string;
  subcategories?: string[];
  explicit?: boolean;
  lang?: string;
  ownerName?: string;
  ownerEmail?: string;
  link?: string;
}

export interface DatabaseConfig {
  badger?: {
    truncate?: boolean;
    file_io?: boolean;
  };
}

export interface DownloaderConfig {
  self_update?: boolean;
  timeout?: number;
}

export interface LogConfig {
  filename?: string;
  max_size?: number;
  max_age?: number;
  max_backups?: number;
  compress?: boolean;
  debug?: boolean;
}
