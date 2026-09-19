"use client";

import { useState, useCallback, useEffect } from "react";
import type { Progress } from "../types";

const STORAGE_KEY = "hp-korean-progress";

const defaultProgress: Progress = {
  chapterIndex: 0,
  position: 0,
  completedChapters: [],
  playCount: {},
  lastPlayed: "",
};

function load(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultProgress, ...JSON.parse(raw) };
  } catch {}
  return { ...defaultProgress };
}

function save(p: Progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {}
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(defaultProgress);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setProgress(load());
    setLoaded(true);
  }, []);

  const update = useCallback((partial: Partial<Progress>) => {
    setProgress((prev) => {
      const next = { ...prev, ...partial, lastPlayed: new Date().toISOString() };
      save(next);
      return next;
    });
  }, []);

  const markChapterPlayed = useCallback((chapterId: string) => {
    setProgress((prev) => {
      const count = (prev.playCount[chapterId] || 0) + 1;
      const next = {
        ...prev,
        playCount: { ...prev.playCount, [chapterId]: count },
        lastPlayed: new Date().toISOString(),
      };
      save(next);
      return next;
    });
  }, []);

  const markChapterCompleted = useCallback((index: number) => {
    setProgress((prev) => {
      if (prev.completedChapters.includes(index)) return prev;
      const next = {
        ...prev,
        completedChapters: [...prev.completedChapters, index],
        lastPlayed: new Date().toISOString(),
      };
      save(next);
      return next;
    });
  }, []);

  return { progress, loaded, update, markChapterPlayed, markChapterCompleted };
}
