import { z } from 'zod';

export const cleanupSchema = z.object({
  keep_last: z.number().int().positive().optional(),
}).passthrough();

export const serverSchema = z.object({
  port: z.number().int().min(1).max(65535).optional(),
  hostname: z.string().optional(),
  bind_address: z.string().optional(),
  path: z.string().regex(/^[A-Za-z0-9]*$/, 'Only alphanumeric characters allowed').optional(),
  web_ui: z.boolean().optional(),
  tls: z.boolean().optional(),
  certificate_path: z.string().optional(),
  key_file_path: z.string().optional(),
  debug_endpoints: z.boolean().optional(),
  no_index: z.boolean().optional(),
  no_listing: z.boolean().optional(),
}).passthrough();

export const storageLocalSchema = z.object({
  data_dir: z.string().optional(),
}).passthrough();

export const storageS3Schema = z.object({
  endpoint_url: z.string().url().optional(),
  region: z.string().optional(),
  bucket: z.string().optional(),
  prefix: z.string().optional(),
}).passthrough();

export const storageSchema = z.object({
  type: z.enum(['local', 's3']).optional(),
  local: storageLocalSchema.optional(),
  s3: storageS3Schema.optional(),
}).passthrough();

export const tokensSchema = z.object({
  youtube: z.union([z.string(), z.array(z.string())]).optional(),
  vimeo: z.union([z.string(), z.array(z.string())]).optional(),
  soundcloud: z.union([z.string(), z.array(z.string())]).optional(),
  twitch: z.union([z.string(), z.array(z.string())]).optional(),
}).passthrough();

export const customFormatSchema = z.object({
  youtube_dl_format: z.string(),
  extension: z.string(),
});

export const feedFiltersSchema = z.object({
  title: z.string().optional(),
  not_title: z.string().optional(),
  description: z.string().optional(),
  not_description: z.string().optional(),
  min_duration: z.number().int().min(0).optional(),
  max_duration: z.number().int().min(0).optional(),
  max_age: z.number().int().min(0).optional(),
  min_age: z.number().int().min(0).optional(),
}).passthrough();

export const hookSchema = z.object({
  command: z.array(z.string()).min(1),
  timeout: z.number().int().positive().optional(),
});

export const feedCustomSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  author: z.string().optional(),
  cover_art: z.string().optional(),
  cover_art_quality: z.enum(['high', 'low']).optional(),
  category: z.string().optional(),
  subcategories: z.array(z.string()).optional(),
  explicit: z.boolean().optional(),
  lang: z.string().optional(),
  ownerName: z.string().optional(),
  ownerEmail: z.string().email().optional(),
  link: z.string().url().optional(),
}).passthrough();

export const feedSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  page_size: z.number().int().min(1).max(500).optional(),
  update_period: z.string().regex(/^\d+[mhd]$|^\d+h\d+m$/, 'e.g. "60m", "4h", "2h45m"').optional(),
  quality: z.enum(['high', 'low']).optional(),
  format: z.enum(['audio', 'video', 'custom']).optional(),
  custom_format: customFormatSchema.optional(),
  playlist_sort: z.enum(['asc', 'desc']).optional(),
  max_height: z.number().int().positive().optional(),
  opml: z.boolean().optional(),
  cron_schedule: z.string().optional(),
  clean: cleanupSchema.optional(),
  filters: feedFiltersSchema.optional(),
  youtube_dl_args: z.array(z.string()).optional(),
  filename_template: z.string().optional(),
  private_feed: z.boolean().optional(),
  post_episode_download: z.array(hookSchema).optional(),
  on_episode_download_error: z.array(hookSchema).optional(),
  custom: feedCustomSchema.optional(),
}).passthrough();

export const databaseSchema = z.object({
  badger: z.object({
    truncate: z.boolean().optional(),
    file_io: z.boolean().optional(),
  }).optional(),
}).passthrough();

export const downloaderSchema = z.object({
  self_update: z.boolean().optional(),
  timeout: z.number().int().positive().optional(),
}).passthrough();

export const logSchema = z.object({
  filename: z.string().optional(),
  max_size: z.number().int().positive().optional(),
  max_age: z.number().int().positive().optional(),
  max_backups: z.number().int().min(0).optional(),
  compress: z.boolean().optional(),
  debug: z.boolean().optional(),
}).passthrough();

export const podsyncConfigSchema = z.object({
  cleanup: cleanupSchema.optional(),
  server: serverSchema.optional(),
  storage: storageSchema.optional(),
  tokens: tokensSchema.optional(),
  feeds: z.record(z.string(), feedSchema).optional(),
  database: databaseSchema.optional(),
  downloader: downloaderSchema.optional(),
  log: logSchema.optional(),
}).passthrough();
