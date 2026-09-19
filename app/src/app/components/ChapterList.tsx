"use client";

import { useState } from "react";
import type { ChapterMeta, Progress } from "../types";

const CHAPTER_SUMMARIES: Record<string, string> = {
  "01_ch01_살아남은아이":
    "Dumbledore and McGonagall leave baby Harry at the Dursleys' doorstep. The wizarding world celebrates Voldemort's defeat, but Harry is left with only a lightning scar.",
  "02_ch02_사라진유리창":
    "Harry lives miserably with the Dursleys, sleeping in a cupboard under the stairs. On Dudley's birthday zoo trip, Harry accidentally makes the glass vanish from a snake's tank.",
  "03_ch03_발신자없는편지들":
    "Mysterious letters keep arriving for Harry. Uncle Vernon tries everything to stop them, eventually fleeing to a hut on a rock in the sea.",
  "04_ch04_숲지기":
    "Hagrid bursts in and tells Harry he's a wizard. He gives Dudley a pig's tail and takes Harry away to buy school supplies.",
  "05_ch05a_다이애건앨리":
    "Hagrid takes Harry to Diagon Alley. They visit Gringotts, where Harry discovers his parents left him gold, and Hagrid picks up a mysterious package from vault 713.",
  "06_ch05b_다이애건앨리2":
    "Harry buys school supplies — robes, books, a cauldron. At Ollivander's he gets his wand: holly and phoenix feather, the twin core of Voldemort's wand.",
  "07_ch06a_정거장":
    "Harry arrives at King's Cross but can't find Platform 9¾. The Weasley family helps him through the barrier. He boards the train and meets Ron.",
  "08_ch06b_정거장2":
    "On the train, Harry and Ron bond over sweets and chocolate frog cards. Hermione stops by looking for Neville's toad. They arrive at Hogwarts and cross the lake in boats.",
  "09_ch07-08_기숙사배정_마법약교수":
    "The Sorting Hat places Harry in Gryffindor. Classes begin — Harry is great at flying but struggles in Potions, where Snape clearly dislikes him.",
  "10_ch09_한밤의결투":
    "Malfoy tricks Harry into a midnight duel. While fleeing Filch, Harry, Ron, Hermione and Neville stumble into the forbidden corridor and find a three-headed dog guarding a trapdoor.",
  "11_ch10_핼러윈":
    "On Halloween, a troll gets into the school. Harry and Ron rescue Hermione from it in the bathroom. The three become friends after the ordeal.",
  "12_ch11_퀴디치":
    "Harry plays his first Quidditch match as Seeker. His broom is jinxed mid-game — Hermione sets Snape's robes on fire. Harry catches the Snitch in his mouth.",
  "13_ch12_이레지드거울":
    "Over Christmas, Harry receives an invisibility cloak. He discovers the Mirror of Erised, which shows him his parents. Dumbledore warns him not to dwell on it.",
  "14_ch13_니콜라플라멜":
    "The trio finally discovers Nicolas Flamel created the Philosopher's Stone — that's what the three-headed dog guards. They suspect Snape wants to steal it for Voldemort.",
};

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
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
          const summary = CHAPTER_SUMMARIES[ch.id];
          const isExpanded = expandedId === ch.id;

          return (
            <div key={ch.id} className="rounded-lg overflow-hidden">
              <div
                className={`
                  flex items-center gap-3 w-full text-left px-4 py-3 transition-colors
                  ${isActive ? "bg-[var(--accent)] text-white" : "bg-[var(--surface)] hover:bg-[var(--surface-hover)]"}
                  ${isExpanded ? "rounded-t-lg" : "rounded-lg"}
                `}
              >
                {isCompleted && !isActive && (
                  <span className="text-[var(--repeat-glow)] text-sm">&#10003;</span>
                )}
                <button
                  className="flex-1 text-left"
                  onClick={() => {
                    onSelect(i);
                    onClose();
                  }}
                >
                  <div className={`text-sm ${isActive ? "font-bold" : ""}`}>{label}</div>
                  {plays > 0 && (
                    <div className="text-xs text-[var(--text-dim)] mt-0.5">
                      {plays}회 재생
                    </div>
                  )}
                </button>
                {isActive && (
                  <span className="text-xs opacity-75 shrink-0">재생 중</span>
                )}
                {summary && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedId(isExpanded ? null : ch.id);
                    }}
                    className={`
                      shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-colors
                      ${isActive ? "hover:bg-white/20 text-white/70" : "hover:bg-[var(--surface-hover)] text-[var(--text-dim)]"}
                    `}
                    aria-label="Chapter summary"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                    </svg>
                  </button>
                )}
              </div>
              {isExpanded && summary && (
                <div className={`
                  px-4 py-3 text-xs leading-relaxed border-t
                  ${isActive ? "bg-[var(--accent)]/80 text-white/90 border-white/10" : "bg-[var(--surface)] text-[var(--text-dim)] border-[var(--border)]"}
                `}>
                  {summary}
                </div>
              )}
            </div>
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
