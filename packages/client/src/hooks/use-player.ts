import { useState, useRef, useEffect, useCallback } from 'react';

interface PlayerState {
  src: string;
  title: string;
  feedId: string;
  filename: string;
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [track, setTrack] = useState<PlayerState | null>(loadState);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Create audio element once
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });
    audio.addEventListener('durationchange', () => {
      setDuration(audio.duration || 0);
    });
    audio.addEventListener('ended', () => {
      setPlaying(false);
    });
    audio.addEventListener('pause', () => setPlaying(false));
    audio.addEventListener('play', () => setPlaying(true));

    // Restore previous track
    const saved = loadState();
    if (saved) {
      audio.src = saved.src;
      audio.currentTime = loadTime();
    }

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Save position periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (track && audioRef.current) {
        saveState(track, audioRef.current.currentTime);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [track]);

  const play = useCallback((src: string, title: string, feedId: string, filename: string) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTrack = { src, title, feedId, filename };

    if (track?.src === src) {
      // Same track - toggle play/pause
      if (audio.paused) {
        audio.play();
      } else {
        audio.pause();
      }
    } else {
      // New track
      audio.src = src;
      audio.currentTime = 0;
      audio.play();
      setTrack(newTrack);
      saveState(newTrack, 0);
    }
  }, [track]);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }, [track]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = '';
    }
    setTrack(null);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
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
