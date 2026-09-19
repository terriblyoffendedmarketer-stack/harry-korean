"use client";

interface Props {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  chapterTitle: string;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onRewind: () => void;
  onPrev: () => void;
  onNext: () => void;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function PlayerControls({
  isPlaying,
  currentTime,
  duration,
  isLoading,
  chapterTitle,
  onPlayPause,
  onSeek,
  onRewind,
  onPrev,
  onNext,
}: Props) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-[var(--player-bg)] border-t border-[var(--border)] px-4 pt-3 pb-6 safe-bottom">
      {/* Chapter title */}
      <div className="text-center text-sm text-[var(--text-dim)] mb-2 truncate">
        {chapterTitle}
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-[var(--text-dim)] w-10 text-right font-mono">
          {formatTime(currentTime)}
        </span>
        <div className="flex-1 relative">
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="w-full"
            style={{
              background: `linear-gradient(to right, var(--accent-light) ${progress}%, var(--border) ${progress}%)`,
            }}
          />
        </div>
        <span className="text-xs text-[var(--text-dim)] w-10 font-mono">
          {formatTime(duration)}
        </span>
      </div>

      {/* Transport controls */}
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={onPrev}
          className="p-2 text-[var(--text-dim)] hover:text-[var(--foreground)] transition-colors"
          aria-label="Previous chapter"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>

        <button
          onClick={onRewind}
          className="p-2 text-[var(--text-dim)] hover:text-[var(--foreground)] transition-colors relative"
          aria-label="Rewind 10 seconds"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.5 3C7.81 3 4 6.81 4 11.5h-3l4 4 4-4H6c0-3.59 2.91-6.5 6.5-6.5S19 7.91 19 11.5 16.09 18 12.5 18v2c4.69 0 8.5-3.81 8.5-8.5S17.19 3 12.5 3z" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold mt-0.5">
            10
          </span>
        </button>

        <button
          onClick={onPlayPause}
          disabled={isLoading}
          className="w-14 h-14 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-light)] flex items-center justify-center transition-colors disabled:opacity-50"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isLoading ? (
            <svg width="24" height="24" viewBox="0 0 24 24" className="animate-spin" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
            </svg>
          ) : isPlaying ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button
          onClick={() => onSeek(currentTime + 30)}
          className="p-2 text-[var(--text-dim)] hover:text-[var(--foreground)] transition-colors relative"
          aria-label="Forward 30 seconds"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.5 3C16.19 3 20 6.81 20 11.5h3l-4 4-4-4h3c0-3.59-2.91-6.5-6.5-6.5S5 7.91 5 11.5 7.91 18 11.5 18v2C6.81 20 3 16.19 3 11.5S6.81 3 11.5 3z" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold mt-0.5">
            30
          </span>
        </button>

        <button
          onClick={onNext}
          className="p-2 text-[var(--text-dim)] hover:text-[var(--foreground)] transition-colors"
          aria-label="Next chapter"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
