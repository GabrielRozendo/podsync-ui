import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar, { SidebarProvider } from './Sidebar';
import StatusBar from './StatusBar';
import { usePlayerContext } from '@/components/player/PlayerContext';
import { Button } from '@/components/ui/button';
import { X, Maximize2, Minimize2, Play, Pause, SkipBack, SkipForward } from 'lucide-react';

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function VideoPlayerOverlay() {
  const { videoRef, isVideo, track, stop, togglePlayPause, seek, playing, currentTime, duration } = usePlayerContext();
  const [expanded, setExpanded] = useState(false);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Audio: keep <video> in DOM (needed for ref) but invisible
  if (!isVideo || !track) {
    return <video ref={videoRef} className="sr-only" aria-hidden />;
  }

  return (
    <div
      className={`fixed z-50 bottom-4 right-4 rounded-xl overflow-hidden shadow-2xl border border-border bg-black transition-all duration-200 group ${
        expanded ? 'w-[520px]' : 'w-80'
      }`}
    >
      {/* Video element */}
      <video ref={videoRef} className="w-full block" />

      {/* Controls overlay — always visible for video */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-2 pt-6">
        {/* Track title */}
        <p className="text-white text-xs font-medium truncate mb-1.5" title={track.title}>
          {track.title}
        </p>

        {/* Seek bar */}
        <div
          className="w-full h-1 bg-white/30 rounded-full cursor-pointer mb-2"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seek((e.clientX - rect.left) / rect.width * duration);
          }}
        >
          <div
            className="h-full bg-white rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white hover:text-white hover:bg-white/20"
              onClick={() => seek(Math.max(0, currentTime - 15))}
              title="Back 15s"
            >
              <SkipBack className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:text-white hover:bg-white/20"
              onClick={togglePlayPause}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white hover:text-white hover:bg-white/20"
              onClick={() => seek(Math.min(duration, currentTime + 30))}
              title="Forward 30s"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </Button>
            <span className="text-white/70 text-[10px] tabular-nums ml-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-white hover:text-white hover:bg-white/20"
              onClick={() => setExpanded((e) => !e)}
              title={expanded ? 'Shrink' : 'Expand'}
            >
              {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-white hover:text-white hover:bg-white/20"
              onClick={stop}
              title="Close"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppShell() {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <StatusBar />
        <main className="md:ml-64 mt-16 p-4 sm:p-6">
          <Outlet />
        </main>
        <VideoPlayerOverlay />
      </div>
    </SidebarProvider>
  );
}
