"use client";

import { useMemo } from "react";
import type { Segment } from "../types";

// Common Korean particles, endings, and function words that should never be marked "rare"
const FUNCTION_WORDS = new Set([
  "이", "그", "저", "것", "수", "나", "는", "은", "을", "를",
  "의", "에", "가", "도", "만", "와", "과", "로", "에서", "까지",
  "부터", "으로", "하고", "이나", "한테", "에게", "께서",
  "다", "또", "더", "못", "안", "잘", "좀", "너무", "아주", "매우",
  "정말", "참", "가장", "많이", "모두", "이제", "다시", "아직",
  "그래서", "그러나", "하지만", "그런데", "그리고", "그럼",
  "네", "예", "아니", "응", "어",
]);

const STRIP_PATTERN = /[.,!?;:"""'''「」『』（）()\[\]…·~\-–—。、「」]/g;

function extractStem(word: string): string {
  let stem = word.replace(STRIP_PATTERN, "");
  // Strip common particles from end
  stem = stem.replace(/(에서|으로|에게|한테|부터|까지|에도|이나|처럼|만큼|보다|라고|이라고|라는|이라는|라며|이라며)$/, "");
  stem = stem.replace(/(을|를|이|가|은|는|의|에|도|만|로|와|과|서)$/, "");
  return stem;
}

export interface WordInfo {
  text: string;
  isRare: boolean;
  isRepeat: boolean;
  repeatCount: number;
}

export function useFrequency(segments: Segment[]) {
  return useMemo(() => {
    // First pass: count all stems across the chapter
    const globalCounts = new Map<string, number>();
    for (const seg of segments) {
      const words = seg.text.split(/\s+/).filter(Boolean);
      for (const word of words) {
        const stem = extractStem(word);
        if (stem.length >= 2 && !FUNCTION_WORDS.has(stem)) {
          globalCounts.set(stem, (globalCounts.get(stem) || 0) + 1);
        }
      }
    }

    // Words appearing <= 2 times in the chapter are "rare" (worth noticing)
    // Words appearing 5+ times are clearly common within this text
    const RARE_THRESHOLD = 2;

    // Second pass: build word infos with sequential repeat tracking
    const seenSoFar = new Map<string, number>();
    const segmentWords: WordInfo[][] = [];

    for (const seg of segments) {
      const words = seg.text.split(/\s+/).filter(Boolean);
      const infos: WordInfo[] = [];

      for (const word of words) {
        const stem = extractStem(word);
        const isShort = stem.length < 2;
        const isFunction = FUNCTION_WORDS.has(stem);

        const globalCount = globalCounts.get(stem) || 0;
        const isRare = !isShort && !isFunction && globalCount <= RARE_THRESHOLD;

        const seenCount = seenSoFar.get(stem) || 0;
        const isRepeat = !isShort && !isFunction && seenCount > 0 && seenCount <= 4;

        if (!isShort && !isFunction) {
          seenSoFar.set(stem, seenCount + 1);
        }

        infos.push({ text: word, isRare, isRepeat, repeatCount: seenCount });
      }

      segmentWords.push(infos);
    }

    return segmentWords;
  }, [segments]);
}
