"use client";

import { useState, useEffect, useCallback } from "react";
import type { Manifest, ChapterData, Segment } from "./types";
import { useAudioPlayer } from "./hooks/useAudioPlayer";
import { useProgress } from "./hooks/useProgress";
import { useVocab } from "./hooks/useVocab";
import { SubtitleDisplay } from "./components/SubtitleDisplay";
import { PlayerControls } from "./components/PlayerControls";
import { ChapterList } from "./components/ChapterList";

const CHAPTER_LABELS: Record<string, string> = {
  "01_ch01_살아남은아이": "1장 살아남은 아이",
  "02_ch02_사라진유리창": "2장 사라진 유리창",
  "03_ch03_발신자없는편지들": "3장 발신자 없는 편지들",
  "04_ch04_숲지기": "4장 숲지기",
  "05_ch05a_다이애건앨리": "5장 다이애건 앨리 (상)",
  "06_ch05b_다이애건앨리2": "5장 다이애건 앨리 (하)",
  "07_ch06a_정거장": "6장 정거장 (상)",
  "08_ch06b_정거장2": "6장 정거장 (하)",
  "09_ch07-08_기숙사배정_마법약교수": "7-8장 기숙사 배정 / 마법약 교수",
  "10_ch09_한밤의결투": "9장 한밤의 결투",
  "11_ch10_핼러윈": "10장 핼러윈",
  "12_ch11_퀴디치": "11장 퀴디치",
  "13_ch12_이레지드거울": "12장 소망의 거울",
  "14_ch13_니콜라플라멜": "13장 니콜라 플라멜",
};

export default function Home() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [chapterData, setChapterData] = useState<ChapterData | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [showChapters, setShowChapters] = useState(false);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(-1);

  const player = useAudioPlayer();
  const { progress, loaded, update, markChapterPlayed, markChapterCompleted } = useProgress();

  const segments = chapterData?.segments || [];
  const { segmentWords, cycleWord } = useVocab(segments);

  useEffect(() => {
    fetch("/data/manifest.json")
      .then((r) => r.json())
      .then((m: Manifest) => setManifest(m));
  }, []);

  useEffect(() => {
    if (loaded && manifest) {
      setChapterIndex(progress.chapterIndex);
    }
  }, [loaded, manifest]);

  useEffect(() => {
    if (!manifest) return;
    const ch = manifest.chapters[chapterIndex];
    if (!ch) return;

    fetch(`/data/${ch.file}`)
      .then((r) => r.json())
      .then((data: ChapterData) => {
        setChapterData(data);
        setCurrentSegmentIndex(-1);
      });

    const audio = player.loadAudio(`/audio/${ch.audio}`);

    if (chapterIndex === progress.chapterIndex && progress.position > 0) {
      audio.addEventListener("loadedmetadata", () => {
        audio.currentTime = progress.position;
      }, { once: true });
    }

    update({ chapterIndex });
  }, [chapterIndex, manifest]);

  useEffect(() => {
    if (!segments.length) return;
    const time = player.currentTime;
    let idx = -1;
    for (let i = segments.length - 1; i >= 0; i--) {
      if (time >= segments[i].start) {
        idx = i;
        break;
      }
    }
    if (idx !== currentSegmentIndex) {
      setCurrentSegmentIndex(idx);
    }
  }, [player.currentTime, segments, currentSegmentIndex]);

  useEffect(() => {
    if (!player.isPlaying) return;
    const interval = setInterval(() => {
      update({ position: player.currentTime });
    }, 5000);
    return () => clearInterval(interval);
  }, [player.isPlaying, player.currentTime, update]);

  useEffect(() => {
    if (!player.audioRef.current || !manifest) return;
    const audio = player.audioRef.current;
    const handler = () => {
      markChapterCompleted(chapterIndex);
      markChapterPlayed(manifest.chapters[chapterIndex].id);
      if (chapterIndex < manifest.chapters.length - 1) {
        setChapterIndex((i) => i + 1);
        setTimeout(() => player.play(), 500);
      }
    };
    audio.addEventListener("ended", handler);
    return () => audio.removeEventListener("ended", handler);
  }, [chapterIndex, manifest, player, markChapterCompleted, markChapterPlayed]);

  const handlePlayPause = useCallback(() => {
    if (player.isPlaying) {
      player.pause();
      update({ position: player.currentTime });
    } else {
      player.play();
    }
  }, [player, update]);

  const handleSegmentClick = useCallback(
    (index: number) => {
      if (segments[index]) {
        player.seek(segments[index].start);
        if (!player.isPlaying) player.play();
      }
    },
    [segments, player]
  );

  const handlePrev = useCallback(() => {
    if (chapterIndex > 0) {
      setChapterIndex((i) => i - 1);
    }
  }, [chapterIndex]);

  const handleNext = useCallback(() => {
    if (manifest && chapterIndex < manifest.chapters.length - 1) {
      setChapterIndex((i) => i + 1);
    }
  }, [chapterIndex, manifest]);

  const currentChapter = manifest?.chapters[chapterIndex];
  const chapterTitle = currentChapter
    ? CHAPTER_LABELS[currentChapter.id] || currentChapter.title
    : "로딩 중...";

  if (!manifest) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-[var(--text-dim)] text-lg">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--player-bg)]">
        <button
          onClick={() => setShowChapters(true)}
          className="flex items-center gap-2 text-[var(--text-dim)] hover:text-[var(--foreground)] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
          </svg>
          <span className="text-sm">챕터</span>
        </button>

        <h1 className="text-sm font-medium text-[var(--accent-light)]">
          해리 포터 한국어
        </h1>

        <div className="flex items-center gap-1">
          <span className="text-xs text-[var(--text-dim)]">0.75x</span>
        </div>
      </header>

      <SubtitleDisplay
        segments={segments}
        segmentWords={segmentWords}
        currentIndex={currentSegmentIndex}
        onSegmentClick={handleSegmentClick}
        onCycleWord={cycleWord}
      />

      <PlayerControls
        isPlaying={player.isPlaying}
        currentTime={player.currentTime}
        duration={player.duration}
        isLoading={player.isLoading}
        chapterTitle={chapterTitle}
        onPlayPause={handlePlayPause}
        onSeek={player.seek}
        onRewind={() => player.rewind(10)}
        onPrev={handlePrev}
        onNext={handleNext}
      />

      {showChapters && (
        <ChapterList
          chapters={manifest.chapters}
          currentIndex={chapterIndex}
          progress={progress}
          onSelect={setChapterIndex}
          onClose={() => setShowChapters(false)}
        />
      )}
    </div>
  );
}
