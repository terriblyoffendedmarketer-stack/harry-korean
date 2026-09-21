"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  const [previousSegmentIndex, setPreviousSegmentIndex] = useState(-1);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});

  const player = useAudioPlayer();
  const { progress, loaded, update, markChapterPlayed, markChapterCompleted } = useProgress();

  const segments = chapterData?.segments || [];
  const { segmentWords, cycleWord } = useVocab(segments);

  useEffect(() => {
    fetch("/data/manifest.json")
      .then((r) => r.json())
      .then((m: Manifest) => setManifest(m));
    fetch("/data/audio_urls.json")
      .then((r) => r.json())
      .then((urls: Record<string, string>) => setAudioUrls(urls))
      .catch(() => {});
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
        setPreviousSegmentIndex(-1);
      });

    const audioSrc = audioUrls[ch.audio] || `/audio/${ch.audio}`;
    const audio = player.loadAudio(audioSrc);

    if (chapterIndex === progress.chapterIndex && progress.position > 0) {
      audio.addEventListener("loadedmetadata", () => {
        audio.currentTime = progress.position;
      }, { once: true });
    }

    update({ chapterIndex });
  }, [chapterIndex, manifest, audioUrls]);

  // Segment sync runs directly in the animation frame loop (not via React state)
  // to avoid batching delays that cause segment skipping.
  const segmentIndexRef = useRef(-1);
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;

  useEffect(() => {
    player.setOnTime((time: number) => {
      const segs = segmentsRef.current;
      if (!segs.length) return;
      let idx = -1;
      for (let i = segs.length - 1; i >= 0; i--) {
        if (time >= segs[i].start) {
          idx = i;
          break;
        }
      }
      if (idx !== segmentIndexRef.current) {
        const prev = segmentIndexRef.current;
        segmentIndexRef.current = idx;
        setPreviousSegmentIndex(prev);
        setCurrentSegmentIndex(idx);
      }
    });
    return () => player.setOnTime(null);
  }, [player]);

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

        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-dim)]">0.75x</span>
          <a
            href="https://github.com/terriblyoffendedmarketer-stack/harry-korean/releases/download/v1.0.0/yer-a-korean-harry.apk"
            className="text-[var(--text-dim)] hover:text-[var(--foreground)] transition-colors"
            title="Download Android app"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 20h14v-2H5v2zm7-18L5.33 8.67l1.42 1.42L11 5.83V16h2V5.83l4.25 4.26 1.42-1.42L12 2z" transform="rotate(180 12 12)" />
            </svg>
          </a>
        </div>
      </header>

      <SubtitleDisplay
        segments={segments}
        segmentWords={segmentWords}
        currentIndex={currentSegmentIndex}
        previousIndex={previousSegmentIndex}
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
