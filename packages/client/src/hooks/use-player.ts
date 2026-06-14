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

export function usePlayer() {
  // Single <video> element handles both audio and video files.
  // The ref is populated by AppShell which always renders <video ref={videoRef}>.
  const videoRef = useRef<HTMLVideoElement>(null);
  const [track, setTrack] = useState<PlayerState | null>(loadState);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const isVideo = track ? isVideoFilename(track.filename) : false;

  // Setup event listeners once the video element is in the DOM
  useEffect(() => {
    const media = videoRef.current;
    if (!media) return;

    const onTimeUpdate = () => setCurrentTime(media.currentTime);
    const onDurationChange = () => setDuration(media.duration || 0);
    const onEnded = () => setPlaying(false);
    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);

    media.addEventListener('timeupdate', onTimeUpdate);
    media.addEventListener('durationchange', onDurationChange);
    media.addEventListener('ended', onEnded);
    media.addEventListener('pause', onPause);
    media.addEventListener('play', onPlay);

    // Restore previous track position from localStorage
    const saved = loadState();
    if (saved) {
      media.src = saved.src;
      media.currentTime = loadTime();
    }

    return () => {
      media.removeEventListener('timeupdate', onTimeUpdate);
      media.removeEventListener('durationchange', onDurationChange);
      media.removeEventListener('ended', onEnded);
      media.removeEventListener('pause', onPause);
      media.removeEventListener('play', onPlay);
      media.pause();
      media.src = '';
    };
  }, []);

  // Save playback position every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (track && videoRef.current) {
        saveState(track, videoRef.current.currentTime);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [track]);

  const play = useCallback((src: string, title: string, feedId: string, filename: string) => {
    const media = videoRef.current;
    if (!media) return;

    const newTrack = { src, title, feedId, filename };

    if (track?.src === src) {
      if (media.paused) {
        media.play();
      } else {
        media.pause();
      }
    } else {
      media.src = src;
      media.currentTime = 0;
      media.play();
      setTrack(newTrack);
      saveState(newTrack, 0);
    }
  }, [track]);

  const togglePlayPause = useCallback(() => {
    const media = videoRef.current;
    if (!media || !track) return;
    if (media.paused) {
      media.play();
    } else {
      media.pause();
    }
  }, [track]);

  const seek = useCallback((time: number) => {
    const media = videoRef.current;
    if (!media) return;
    media.currentTime = time;
    setCurrentTime(time);
  }, []);

  const stop = useCallback(() => {
    const media = videoRef.current;
    if (media) {
      media.pause();
      media.src = '';
    }
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
