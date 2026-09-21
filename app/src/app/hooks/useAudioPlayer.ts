"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const animFrameRef = useRef<number>(0);
  const onTimeRef = useRef<((t: number) => void) | null>(null);
  const lastReportedTimeRef = useRef<number>(0);

  const tick = useCallback(() => {
    if (audioRef.current) {
      const t = audioRef.current.currentTime;
      // Fire the time callback on every frame for responsive sync
      onTimeRef.current?.(t);
      // Only update React state every ~250ms for UI (progress bar, etc.)
      if (Math.abs(t - lastReportedTimeRef.current) > 0.25) {
        lastReportedTimeRef.current = t;
        setCurrentTime(t);
      }
    }
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const loadAudio = useCallback(
    (src: string) => {
      if (audioRef.current) {
        audioRef.current.pause();
        cancelAnimationFrame(animFrameRef.current);
      }
      setIsLoading(true);
      const audio = new Audio(src);
      audio.preload = "auto";
      audioRef.current = audio;

      audio.addEventListener("loadedmetadata", () => {
        setDuration(audio.duration);
        setIsLoading(false);
      });
      audio.addEventListener("ended", () => {
        setIsPlaying(false);
        cancelAnimationFrame(animFrameRef.current);
      });
      audio.addEventListener("error", () => {
        setIsLoading(false);
      });

      return audio;
    },
    [tick]
  );

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        animFrameRef.current = requestAnimationFrame(tick);
      });
    }
  }, [tick]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      cancelAnimationFrame(animFrameRef.current);
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      lastReportedTimeRef.current = time;
    }
  }, []);

  const rewind = useCallback(
    (seconds: number = 10) => {
      if (audioRef.current) {
        const t = Math.max(0, audioRef.current.currentTime - seconds);
        seek(t);
      }
    },
    [seek]
  );

  const setOnTime = useCallback((cb: ((t: number) => void) | null) => {
    onTimeRef.current = cb;
  }, []);

  const onEnded = useCallback((cb: () => void) => {
    if (audioRef.current) {
      audioRef.current.addEventListener("ended", cb);
      return () => audioRef.current?.removeEventListener("ended", cb);
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    isLoading,
    loadAudio,
    play,
    pause,
    seek,
    rewind,
    onEnded,
    setOnTime,
  };
}
