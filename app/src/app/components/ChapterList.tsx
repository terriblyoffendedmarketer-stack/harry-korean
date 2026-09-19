"use client";

import type { ChapterMeta, Progress } from "../types";

const CHAPTER_LABELS: Record<string, string> = {
  "01_ch01_살아남은아이": "1장 살아남은 아이",
  "02_ch02_사라진유리창": "2장 사라진 유리창",
  "03_ch03_발신자없는편지들": "3장 발신자 없는 편지들",
  "04_ch04_숲지기": "4장 숲지기",
  "05_ch05a_다이애건앨리": "5장 다이애건 앨리 (상)",
  "06_ch05b_다이애건앨리2": "5장 다이애건 앨리 (하)",
  "07_ch06a_정거장": "6장 정거장에서 떠나는 여행 (상)",
  "08_ch06b_정거장2": "6장 정거장에서 떠나는 여행 (하)",
  "09_ch07-08_기숙사배정_마법약교수": "7-8장 기숙사 배정 / 마법약 교수",
  "10_ch09_한밤의결투": "9장 한밤의 결투",
  "11_ch10_핼러윈": "10장 핼러윈",
  "12_ch11_퀴디치": "11장 퀴디치",
  "13_ch12_이레지드거울": "12장 소망의 거울",
  "14_ch13_니콜라플라멜": "13장 니콜라 플라멜",
};

interface Props {
  chapters: ChapterMeta[];
  currentIndex: number;
  progress: Progress;
  onSelect: (index: number) => void;
  onClose: () => void;
}

export function ChapterList({ chapters, currentIndex, progress, onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-[var(--background)] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-lg font-bold">해리 포터와 마법사의 돌</h2>
        <button
          onClick={onClose}
          className="p-2 text-[var(--text-dim)] hover:text-[var(--foreground)]"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {chapters.map((ch, i) => {
          const label = CHAPTER_LABELS[ch.id] || ch.title;
          const isActive = i === currentIndex;
          const isCompleted = progress.completedChapters.includes(i);
          const plays = progress.playCount[ch.id] || 0;

          return (
            <button
              key={ch.id}
              onClick={() => {
                onSelect(i);
                onClose();
              }}
              className={`
                w-full text-left px-4 py-3 rounded-lg transition-colors
                ${isActive ? "bg-[var(--accent)] text-white" : "bg-[var(--surface)] hover:bg-[var(--surface-hover)]"}
              `}
            >
              <div className="flex items-center gap-3">
                {isCompleted && !isActive && (
                  <span className="text-[var(--repeat-glow)] text-sm">&#10003;</span>
                )}
                <div className="flex-1">
                  <div className={`text-sm ${isActive ? "font-bold" : ""}`}>{label}</div>
                  {plays > 0 && (
                    <div className="text-xs text-[var(--text-dim)] mt-0.5">
                      {plays}회 재생
                    </div>
                  )}
                </div>
                {isActive && (
                  <span className="text-xs opacity-75">재생 중</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Stats */}
      <div className="px-4 py-3 border-t border-[var(--border)] text-center text-sm text-[var(--text-dim)]">
        {progress.completedChapters.length}/{chapters.length} 챕터 완료
      </div>
    </div>
  );
}
