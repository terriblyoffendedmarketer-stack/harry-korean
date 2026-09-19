"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { Segment } from "../types";
import type { VocabWord, WordStatus } from "../hooks/useVocab";

interface Props {
  segments: Segment[];
  segmentWords: VocabWord[][];
  currentIndex: number;
  onSegmentClick: (index: number) => void;
  onCycleWord: (stem: string) => void;
}

interface PopupState {
  word: VocabWord;
  x: number;
  y: number;
}

function wordClass(status: WordStatus, isActive: boolean): string {
  if (status === "known") return "";
  if (status === "new") {
    return isActive
      ? "bg-[#2a4a7a]/60 rounded px-0.5 -mx-0.5"
      : "bg-[#2a4a7a]/30 rounded px-0.5 -mx-0.5";
  }
  // learning
  return isActive
    ? "bg-[#7a6a2a]/50 rounded px-0.5 -mx-0.5"
    : "bg-[#7a6a2a]/30 rounded px-0.5 -mx-0.5";
}

export function SubtitleDisplay({
  segments,
  segmentWords,
  currentIndex,
  onSegmentClick,
  onCycleWord,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const [popup, setPopup] = useState<PopupState | null>(null);

  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      const container = containerRef.current;
      const el = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const offset = elRect.top - containerRect.top - containerRect.height / 3;
      container.scrollTo({ top: container.scrollTop + offset, behavior: "smooth" });
    }
  }, [currentIndex]);

  useEffect(() => {
    setPopup(null);
  }, [currentIndex]);

  const handleWordClick = useCallback(
    (e: React.MouseEvent, word: VocabWord) => {
      if (!word.definition) return;
      e.stopPropagation();
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      setPopup((prev) => {
        if (prev && prev.word.stem === word.stem) return null;
        return {
          word,
          x: rect.left + rect.width / 2 - containerRect.left,
          y: rect.top - containerRect.top + containerRef.current!.scrollTop - 8,
        };
      });
    },
    []
  );

  const handlePopupAction = useCallback(
    (stem: string) => {
      onCycleWord(stem);
      setPopup(null);
    },
    [onCycleWord]
  );

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth relative">
      <div className="max-w-lg mx-auto space-y-2">
        {segments.map((seg, i) => {
          const isActive = i === currentIndex;
          const isPast = i < currentIndex;
          const isFuture = i > currentIndex && i <= currentIndex + 4;
          const words = segmentWords[i] || [];

          return (
            <div
              key={i}
              ref={isActive ? activeRef : undefined}
              onClick={() => onSegmentClick(i)}
              className={`
                px-3 py-2 rounded-lg cursor-pointer transition-all duration-300
                ${isActive ? "bg-[var(--surface)] border border-[var(--accent)] shadow-[0_0_20px_rgba(124,58,237,0.15)]" : ""}
                ${isPast ? "opacity-30" : ""}
                ${isFuture ? "opacity-80" : ""}
                ${!isActive && !isPast ? "hover:bg-[var(--surface-hover)]" : ""}
              `}
            >
              <p className={`leading-relaxed ${isActive ? "text-xl font-medium" : "text-lg"}`}>
                {words.map((w, j) => (
                  <span
                    key={j}
                    onClick={(e) => handleWordClick(e, w)}
                    className={`
                      ${wordClass(w.status, isActive)}
                      ${w.definition ? "cursor-pointer" : ""}
                      ${isActive ? "text-[var(--foreground)]" : ""}
                    `}
                  >
                    {w.text}{" "}
                  </span>
                ))}
              </p>
            </div>
          );
        })}
        <div className="h-48" />
      </div>

      {popup && (
        <div
          className="absolute z-40 transform -translate-x-1/2"
          style={{ left: popup.x, top: popup.y }}
        >
          <div className="relative bg-[#1e1e3a] border border-[var(--accent-light)]/40 rounded-lg shadow-xl px-4 py-3 min-w-[160px] max-w-[280px]">
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
              <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#1e1e3a]" />
            </div>
            <div className="text-center mb-2">
              <span className="text-[var(--accent-light)] font-medium text-base">
                {popup.word.stem}
              </span>
            </div>
            <div className="text-center text-[var(--foreground)] text-sm mb-3">
              {popup.word.definition}
            </div>
            <div className="flex justify-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePopupAction(popup.word.stem);
                }}
                className="text-xs px-3 py-1 rounded-full bg-[var(--accent)]/30 text-[var(--accent-light)] hover:bg-[var(--accent)]/50 transition-colors"
              >
                {popup.word.status === "new"
                  ? "Learning"
                  : popup.word.status === "learning"
                    ? "I know this"
                    : "Mark new"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPopup(null);
                }}
                className="text-xs px-2 py-1 text-[var(--text-dim)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
