import { tomlService } from './toml.service.js';

export interface RssEpisode {
  guid: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  duration: string;
  imageUrl: string;
  enclosureUrl: string;
  enclosureLength: number;
}

export interface RssFeed {
  title: string;
  description: string;
  imageUrl: string;
  lastBuildDate: string;
  episodes: RssEpisode[];
}

function decodeEntities(str: string): string {
  return str
    .replace(/&#xA;/g, '\n')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'");
}

function extractTag(xml: string, tag: string): string {
  // Handle CDATA
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`));
  if (cdataMatch) return cdataMatch[1].trim();

  const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`));
  return match ? decodeEntities(match[1].trim()) : '';
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"[^>]*/?>`, 's'));
  return match ? match[1] : '';
}

class RssService {
  private async getPodsyncBaseUrl(): Promise<string> {
    const config = await tomlService.read();
    return config.server?.hostname || `http://localhost:${config.server?.port || 8080}`;
  }

  async fetchFeedXml(feedId: string): Promise<RssFeed | null> {
    const baseUrl = await this.getPodsyncBaseUrl();
    const xmlUrl = `${baseUrl}/${feedId}.xml`;

    try {
      const response = await fetch(xmlUrl, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) return null;
      const xml = await response.text();
      return this.parseXml(xml);
    } catch {
      return null;
    }
  }

  private parseXml(xml: string): RssFeed {
    const channelMatch = xml.match(/<channel>([\s\S]*)<\/channel>/);
    const channelXml = channelMatch ? channelMatch[1] : xml;

    // Split items
    const items = channelXml.split(/<item>/g).slice(1);

    const episodes: RssEpisode[] = items.map((itemXml) => {
      const enclosureMatch = itemXml.match(/<enclosure\s+url="([^"]*)"[^>]*length="([^"]*)"[^>]*\/?>/);
      return {
        guid: extractTag(itemXml, 'guid'),
        title: extractTag(itemXml, 'title'),
        description: extractTag(itemXml, 'description') || extractTag(itemXml, 'itunes:summary'),
        link: extractTag(itemXml, 'link'),
        pubDate: extractTag(itemXml, 'pubDate'),
        duration: extractTag(itemXml, 'itunes:duration'),
        imageUrl: extractAttr(itemXml, 'itunes:image', 'href'),
        enclosureUrl: enclosureMatch ? enclosureMatch[1] : '',
        enclosureLength: enclosureMatch ? parseInt(enclosureMatch[2], 10) : 0,
      };
    });

    const channelHeader = channelXml.split('<item>')[0];
    return {
      title: extractTag(channelHeader, 'title'),
      description: extractTag(channelHeader, 'description'),
      imageUrl: extractAttr(channelHeader, 'itunes:image', 'href'),
      lastBuildDate: extractTag(channelHeader, 'lastBuildDate'),
      episodes,
    };
  }
}

export const rssService = new RssService();
