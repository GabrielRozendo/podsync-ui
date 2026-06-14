import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar, { SidebarProvider } from './Sidebar';
import StatusBar from './StatusBar';
import { usePlayerContext } from '@/components/player/PlayerContext';
import { Button } from '@/components/ui/button';
import { X, Maximize2, Minimize2 } from 'lucide-react';

function VideoPlayerOverlay() {
  const { videoRef, isVideo, track, stop } = usePlayerContext();
  const [expanded, setExpanded] = useState(false);

  // The <video> element is ALWAYS in the DOM so videoRef is always populated.
  // When audio: sr-only (invisible, 0 size). When video: floating overlay.
  if (!isVideo || !track) {
    return <video ref={videoRef} className="sr-only" />;
  }

  return (
    <div
      className={`fixed z-50 bottom-4 right-4 rounded-lg overflow-hidden shadow-2xl border border-border bg-black transition-all duration-200 ${
        expanded ? 'w-[480px]' : 'w-72'
      }`}
    >
      <video ref={videoRef} className="w-full block" />
      <div className="absolute top-1 right-1 flex gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 bg-black/60 hover:bg-black/90 text-white border-0"
          onClick={() => setExpanded((e) => !e)}
          title={expanded ? 'Shrink' : 'Expand'}
        >
          {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 bg-black/60 hover:bg-black/90 text-white border-0"
          onClick={stop}
          title="Close player"
        >
          <X className="h-3 w-3" />
        </Button>
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
