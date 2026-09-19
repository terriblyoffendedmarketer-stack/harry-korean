# Harry Potter Korean Audiobook Learning Tool

## Status
- **Phase**: Core features complete, vocab dictionary could be expanded
- **Source**: 뭉이모TV YouTube channel (14 Harry Potter 마법사의돌 audiobook videos)
- **Goal**: Learning aid app — 0.75x audiobook player with synced Korean subtitles and learning science features

## Roadmap
- [x] Download all 14 HP videos + auto-generated Korean subs
- [x] Extract audio, convert to 0.75x speed MP3
- [x] Extract EPUB chapter text, align to auto-sub timestamps
- [x] Build Next.js web app with audiobook player
- [x] Implement learning features (vocab glossing, replay, progress)
- [x] Fix subtitle sync (reverse-scan matching, verified with Whisper)
- [x] Rechunk subtitles at sentence boundaries
- [x] LingQ-style vocabulary glossing (tap-to-reveal English definitions)
- [ ] Expand dictionary beyond 375 entries

## File Map
- `originals/` — Raw downloaded videos (14 MP4 files)
- `audio/` — Extracted audio (M4A, original speed)
- `audio_slow/` — 0.75x speed audio (MP3, used by the app)
- `subs/` — Auto-generated subtitle files (SRT + json3 for timestamps)
- `subs_aligned/` — EPUB-aligned subtitles (source of truth for rechunking)
- `chapters/` — EPUB text per book chapter
- `chapters_aligned/` — EPUB text split per video
- `app/` — Next.js web app (the main deliverable)
- `app/public/audio/` — Symlinks to audio_slow MP3s
- `app/public/data/` — Rechunked subtitle JSON + manifest + dictionary.json
- `app/src/app/hooks/useVocab.ts` — LingQ-style vocabulary hook (replaces useFrequency)
- `app/src/app/components/SubtitleDisplay.tsx` — Subtitle view with tappable vocab words
- `scripts/download.sh` — Downloads videos + subs via yt-dlp (needs Chrome cookies)
- `scripts/extract_epub.py` — Extracts chapter text from EPUB
- `scripts/align_subs_v2.py` — Alignment (sequential fuzzy matching)
- `scripts/rechunk_segments.py` — Rechunk auto-sub fragments into sentence-level segments
- `scripts/gen_dictionary.py` — Generate Korean-English dictionary JSON

## Setup & Run
```bash
# Run the app
cd app && npm run dev
# Opens at http://localhost:3000

# If starting fresh, run data pipeline first:
bash scripts/download.sh              # needs Chrome cookies for YouTube
python3 scripts/extract_epub.py       # extract EPUB chapters
python3 scripts/align_subs_v2.py      # align EPUB text to timestamps
python3 scripts/rechunk_segments.py   # rechunk into sentences
python3 scripts/gen_dictionary.py     # generate vocab dictionary
```
Requires: node 18+, yt-dlp, ffmpeg, python3

## Learning Features
1. Sentence-level subtitles with auto-scroll (priming)
2. LingQ-style vocabulary glossing — tap common words for English definitions
3. Word state tracking: new (blue) → learning (yellow) → known (no highlight)
4. Tap-to-replay any segment (narrow listening)
5. 10s rewind button for segment replay
6. Progress persistence (chapter, position, play counts)
7. Chapter summaries in English for comprehension priming

## Notes
- Videos use Chrome cookies for download (`--cookies-from-browser chrome`)
- EPUB Section0033 is Book 2 preview — excluded from extraction
- Ch5/6 split into 2 videos each; Ch7+8 combined in one video
- Subtitle sync uses reverse-scan (last segment whose start ≤ currentTime)
- Rechunking: Korean sentence-end regex + verb endings + space fallback
- Dictionary has 375 entries covering most frequent content words
