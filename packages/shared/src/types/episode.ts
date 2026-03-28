export interface Episode {
  filename: string;
  feedId: string;
  filePath: string;
  fileSizeBytes: number;
  modifiedAt: string;
  duration?: number;
  format: string;
  // Enriched from RSS feed XML
  title?: string;
  description?: string;
  episodeLink?: string;
  thumbnailUrl?: string;
  pubDate?: string;
  inRss?: boolean;
  metadataSource?: 'rss' | 'ytdlp' | 'none';
}

export interface EpisodeListResponse {
  episodes: Episode[];
  total: number;
  page: number;
  pageSize: number;
  feedTitle?: string;
  feedImageUrl?: string;
}
