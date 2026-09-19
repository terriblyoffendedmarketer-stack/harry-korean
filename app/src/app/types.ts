export interface Segment {
  start: number;
  end: number;
  text: string;
  confidence: number;
}

export interface ChapterData {
  id: string;
  segments: Segment[];
}

export interface ChapterMeta {
  id: string;
  file: string;
  audio: string;
  title: string;
  segments: number;
}

export interface Manifest {
  title: string;
  chapters: ChapterMeta[];
}

export interface Progress {
  chapterIndex: number;
  position: number;
  completedChapters: number[];
  playCount: Record<string, number>;
  lastPlayed: string;
}
