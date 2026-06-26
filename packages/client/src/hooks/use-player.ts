import { useState, useRef, useEffect, useCallback } from 'react';

export interface PlayerState {
  src: string;
  title: string;
  feedId: string;
  filename: string;
}

const VIDEO_EXTS = new Set(['mp4', 'webm', 'mkv', 'm4v', 'mov', 'avi']);

export function isVideoFilename(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return VIDEO_EXTS.has(ext);
}

const STORAGE_KEY = 'podsync-ui-player';

function loadState(): PlayerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(state: PlayerState | null, currentTime: number) {
  if (state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, currentTime }));
  }
}

function loadTime(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.currentTime || 0;
    }
  } catch { /* ignore */ }
  return 0;
}

interface PendingMedia {
  src: string;
  time: number;
  autoplay: boolean;
}

export function usePlayer() {
  // A single <video> element handles both audio and video files. The element is
  // recreated by AppShell whenever it toggles between the hidden (audio) and
  // visible (video overlay) branches, so we attach listeners via a callback ref
  // that re-binds every time the underlying DOM node changes.
  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const [track, setTrack] = useState<PlayerState | null>(loadState);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const isVideo = track ? isVideoFilename(track.filename) : false;

  // What a freshly-mounted <video> node should be initialized with. Seeded from
  // localStorage so a reload restores the last track/position without autoplay.
  const pendingRef = useRef<PendingMedia | null>(
    (() => {
      const saved = loadState();
      return saved ? { src: saved.src, time: loadTime(), autoplay: false } : null;
    })(),
  );

  // Stable event handlers so we can add/remove them across element swaps.
  const handlersRef = useRef<Record<string, () => void> | null>(null);
  if (!handlersRef.current) {
    handlersRef.current = {
      timeupdate: () => setCurrentTime(mediaRef.current?.currentTime ?? 0),
      durationchange: () => setDuration(mediaRef.current?.duration || 0),
      loadedmetadata: () => setDuration(mediaRef.current?.duration || 0),
      ended: () => setPlaying(false),
      pause: () => setPlaying(false),
      play: () => setPlaying(true),
    };
  }

  const attachHandlers = useCallback((node: HTMLVideoElement) => {
    const handlers = handlersRef.current!;
    for (const [event, handler] of Object.entries(handlers)) {
      node.addEventListener(event, handler);
    }
  }, []);

  const detachHandlers = useCallback((node: HTMLVideoElement) => {
    const handlers = handlersRef.current!;
    for (const [event, handler] of Object.entries(handlers)) {
      node.removeEventListener(event, handler);
    }
  }, []);

  // Callback ref: React calls this with `null` when the old node unmounts and
  // with the new node when it mounts. We rebind listeners and re-sync playback
  // state onto whichever element is currently live.
  const videoRef = useCallback((node: HTMLVideoElement | null) => {
    const prev = mediaRef.current;
    if (prev && prev !== node) {
      detachHandlers(prev);
      prev.pause();
    }

    mediaRef.current = node;
    if (!node) return;

    attachHandlers(node);

    // Initialize the freshly-mounted element from the pending media (either the
    // current track being played, or the restored track from localStorage).
    const pending = pendingRef.current;
    if (pending) {
      if (node.src !== pending.src) node.src = pending.src;
      if (pending.time) node.currentTime = pending.time;
      setCurrentTime(pending.time);
      setDuration(0);
      if (pending.autoplay) {
        void node.play();
      }
    }
  }, [attachHandlers, detachHandlers]);

  // Save playback position every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (track && mediaRef.current) {
        saveState(track, mediaRef.current.currentTime);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [track]);

  const play = useCallback((src: string, title: string, feedId: string, filename: string) => {
    const media = mediaRef.current;

    if (track?.src === src) {
      pendingRef.current = { src, time: media?.currentTime ?? 0, autoplay: true };
      if (media) {
        if (media.paused) {
          void media.play();
        } else {
          media.pause();
        }
      }
      return;
    }

    const newTrack = { src, title, feedId, filename };
    pendingRef.current = { src, time: 0, autoplay: true };

    // Reset stale state immediately so the UI doesn't flash the previous
    // track's duration/position before the new metadata loads.
    setDuration(0);
    setCurrentTime(0);
    setPlaying(false);
    setTrack(newTrack);
    saveState(newTrack, 0);

    // If the element type doesn't change, the same node stays mounted and the
    // callback ref won't fire — so apply to the current node directly too.
    if (media) {
      const wasVideo = track ? isVideoFilename(track.filename) : false;
      if (wasVideo === isVideoFilename(filename)) {
        media.src = src;
        media.currentTime = 0;
        void media.play();
      }
    }
  }, [track]);

  const togglePlayPause = useCallback(() => {
    const media = mediaRef.current;
    if (!media || !track) return;
    if (media.paused) {
      void media.play();
    } else {
      media.pause();
    }
  }, [track]);

  const seek = useCallback((time: number) => {
    const media = mediaRef.current;
    if (!media) return;
    media.currentTime = time;
    setCurrentTime(time);
    if (pendingRef.current) pendingRef.current.time = time;
  }, []);

  const stop = useCallback(() => {
    const media = mediaRef.current;
    if (media) {
      media.pause();
      media.removeAttribute('src');
      media.load();
    }
    pendingRef.current = null;
    setTrack(null);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    videoRef,
    isVideo,
    track,
    playing,
    currentTime,
    duration,
    play,
    togglePlayPause,
    seek,
    stop,
  };
}
