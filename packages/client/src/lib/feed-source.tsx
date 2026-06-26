import { ExternalLink } from 'lucide-react';

export type FeedSourcePlatform = 'youtube' | 'vimeo' | 'soundcloud' | 'twitch' | 'generic';

export interface FeedSource {
  platform: FeedSourcePlatform;
  label: string;
  url: string;
}

export function detectFeedSource(url: string): FeedSource | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const hostname = new URL(trimmed).hostname.replace(/^www\./, '').toLowerCase();
    if (hostname === 'youtube.com' || hostname === 'youtu.be' || hostname === 'm.youtube.com') {
      return { platform: 'youtube', label: 'YouTube', url: trimmed };
    }
    if (hostname === 'vimeo.com' || hostname === 'player.vimeo.com') {
      return { platform: 'vimeo', label: 'Vimeo', url: trimmed };
    }
    if (hostname === 'soundcloud.com' || hostname === 'm.soundcloud.com') {
      return { platform: 'soundcloud', label: 'SoundCloud', url: trimmed };
    }
    if (hostname === 'twitch.tv' || hostname === 'm.twitch.tv' || hostname === 'www.twitch.tv') {
      return { platform: 'twitch', label: 'Twitch', url: trimmed };
    }
    return { platform: 'generic', label: 'Source', url: trimmed };
  } catch {
    return null;
  }
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8ZM9.75 15.02V8.98L15.5 12l-5.75 3.02Z" />
    </svg>
  );
}

function VimeoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M23.98 6.14c-.1 2.1-1.57 4.98-4.4 8.64-2.93 3.8-5.41 5.7-7.44 5.7-1.25 0-2.32-1.16-3.2-3.48-.58-1.7-1.04-3.4-1.38-5.1-.48-1.98-1-2.97-1.56-2.97-.12 0-.54.25-1.26.75L2.48 8.9c.8-.7 1.58-1.4 2.35-2.1 1.06-.93 1.86-1.42 2.4-1.47 1.26-.12 2.03.74 2.32 2.58.31 1.98.53 3.2.65 3.68.36 1.64.76 2.46 1.2 2.46.34 0 .85-.54 1.53-1.62.68-1.08 1.04-1.9 1.08-2.46.1-1.66-.48-2.48-1.74-2.46-1.24.02-2.24.22-3 .6 2.98-9.76 8.66-14.5 17.04-14.22.62.02 1.12.23 1.5.63.38.4.56.94.54 1.62Z" />
    </svg>
  );
}

function SoundCloudIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M7.5 17.5c-2.2 0-4-1.8-4-4s1.8-4 4-4c.3 0 .6.03.9.1C9.1 7.6 11.4 6 14 6c3.3 0 6 2.7 6 6 0 .3 0 .7-.1 1 1.2.4 2.1 1.5 2.1 2.9 0 1.7-1.3 3-3 3H7.5Z" />
      <path d="M4.5 14.5v3M6.5 13.5v4M8.5 12.5v5M10.5 11.5v6M12.5 10.5v7M14.5 9.5v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function TwitchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M2.15 0 1 4.05v15.9h5.1V24h3.15l2.95-3.05H14.7L22.5 12.9V0H2.15ZM20.4 11.85 16.8 15.5h-3.3l-2.85 2.95v-2.95H7.8V2.1h12.6v9.75ZM17.55 5.25v5.1h-2.55V5.25h2.55Zm-6.6 0v5.1H8.4V5.25h2.55Z" />
    </svg>
  );
}

export function FeedSourceIcon({ platform, className }: { platform: FeedSourcePlatform; className?: string }) {
  switch (platform) {
    case 'youtube':
      return <YoutubeIcon className={className} />;
    case 'vimeo':
      return <VimeoIcon className={className} />;
    case 'soundcloud':
      return <SoundCloudIcon className={className} />;
    case 'twitch':
      return <TwitchIcon className={className} />;
    default:
      return <ExternalLink className={className} />;
  }
}
