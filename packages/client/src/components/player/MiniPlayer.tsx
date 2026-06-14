import { usePlayerContext } from './PlayerContext';
import { Play, Pause, SkipBack, SkipForward, X, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MiniPlayer() {
  const { track, playing, currentTime, duration, isVideo, togglePlayPause, seek, stop } = usePlayerContext();

  if (!track) return null;

  // Video: show only track title — controls live on the VideoPlayerOverlay (bottom-right)
  if (isVideo) {
    return (
      <div className="border-t px-4 py-3">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <Video className="h-3 w-3 shrink-0 text-muted-foreground" />
            <p className="text-xs font-medium truncate text-muted-foreground" title={track.title}>
              {track.title}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 flex-shrink-0 text-muted-foreground hover:text-foreground"
            onClick={stop}
            title="Close player"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5 pl-[18px]">Controls on video overlay ↘</p>
      </div>
    );
  }

  // Audio: full mini player with seek and controls
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="border-t px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-1">
        <p className="text-xs font-medium truncate flex-1" title={track.title}>
          {track.title}
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 flex-shrink-0 text-muted-foreground hover:text-foreground"
          onClick={stop}
          title="Close player"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Progress bar */}
      <div
        className="w-full h-1.5 bg-muted rounded-full cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          seek((e.clientX - rect.left) / rect.width * duration);
        }}
      >
        <div
          className="h-full bg-primary rounded-full transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Time + Controls */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground tabular-nums w-10">
          {formatTime(currentTime)}
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => seek(Math.max(0, currentTime - 15))}
            title="Back 15s"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={togglePlayPause}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => seek(Math.min(duration, currentTime + 30))}
            title="Forward 30s"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
