"use client";

import { useRef, useEffect } from "react";
import type { Segment } from "../types";
import type { WordInfo } from "../hooks/useFrequency";

interface Props {
  segments: Segment[];
  segmentWords: WordInfo[][];
  currentIndex: number;
  onSegmentClick: (index: number) => void;
}

export function SubtitleDisplay({ segments, segmentWords, currentIndex, onSegmentClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth">
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
                {words.map((w, j) => {
                  const showRepeatDot = isActive && w.isRepeat && w.repeatCount <= 3;
                  return (
                    <span
                      key={j}
                      className={`
                        ${isActive && w.isRepeat ? "repeat-glow text-[var(--repeat-glow)]" : ""}
                        ${w.isRare && !isPast ? "underline decoration-[var(--text-rare)] decoration-dotted underline-offset-4 decoration-1" : ""}
                        ${isActive ? "text-[var(--foreground)]" : ""}
                      `}
                    >
                      {showRepeatDot && <span className="text-[var(--repeat-glow)] text-xs align-super mr-px">&#x2022;</span>}
                      {w.text}{" "}
                    </span>
                  );
                })}
              </p>
            </div>
          );
        })}
        <div className="h-48" />
      </div>
    </div>
  );
}
