"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import type { Segment } from "../types";

const STRIP_PATTERN = /[.,!?;:"""'''「」『』（）()\[\]…·~\-–—。、「」]/g;
const PARTICLES_LONG = /(에서|으로|에게|한테|부터|까지|에도|이나|처럼|만큼|보다|라고|이라고|라는|이라는|라며|이라며)$/;
const PARTICLES_SHORT = /(을|를|이|가|은|는|의|에|도|만|로|와|과|서)$/;

function stripParticles(word: string): string {
  let stem = word.replace(STRIP_PATTERN, "");
  stem = stem.replace(PARTICLES_LONG, "");
  stem = stem.replace(PARTICLES_SHORT, "");
  return stem;
}

export type WordStatus = "new" | "learning" | "known";

export interface VocabWord {
  text: string;
  stem: string;
  definition: string | null;
  status: WordStatus;
}

type Dictionary = Record<string, string>;
type KnownWords = Record<string, WordStatus>;

const STORAGE_KEY = "hp-korean-vocab";

function loadKnownWords(): KnownWords {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveKnownWords(words: KnownWords) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  } catch {}
}

export function useVocab(segments: Segment[]) {
  const [dictionary, setDictionary] = useState<Dictionary>({});
  const [knownWords, setKnownWords] = useState<KnownWords>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/data/dictionary.json")
      .then((r) => r.json())
      .then((d: Dictionary) => {
        setDictionary(d);
        setKnownWords(loadKnownWords());
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const lookupDefinition = useCallback(
    (stem: string, original: string): string | null => {
      if (dictionary[original]) return dictionary[original];
      if (dictionary[stem]) return dictionary[stem];
      const cleaned = original.replace(STRIP_PATTERN, "");
      if (dictionary[cleaned]) return dictionary[cleaned];
      return null;
    },
    [dictionary]
  );

  const segmentWords = useMemo(() => {
    if (!loaded) return segments.map(() => [] as VocabWord[]);

    const result: VocabWord[][] = [];
    for (const seg of segments) {
      const words = seg.text.split(/\s+/).filter(Boolean);
      const infos: VocabWord[] = [];

      for (const word of words) {
        const stem = stripParticles(word);
        const definition = lookupDefinition(stem, word);
        const status: WordStatus = definition
          ? knownWords[stem] || "new"
          : "known";

        infos.push({ text: word, stem, definition, status });
      }
      result.push(infos);
    }
    return result;
  }, [segments, loaded, dictionary, knownWords, lookupDefinition]);

  const markWord = useCallback(
    (stem: string, status: WordStatus) => {
      setKnownWords((prev) => {
        const next = { ...prev, [stem]: status };
        if (status === "known") delete next[stem];
        saveKnownWords(next);
        return next;
      });
    },
    []
  );

  const cycleWord = useCallback(
    (stem: string) => {
      const current = knownWords[stem] || "new";
      const next: WordStatus =
        current === "new" ? "learning" : current === "learning" ? "known" : "new";
      markWord(stem, next);
    },
    [knownWords, markWord]
  );

  return { segmentWords, markWord, cycleWord, loaded };
}
