# Harry Potter Korean Audiobook Learning Tool

## Status
- **Phase**: App built and running, polish pass in progress
- **Source**: 뭉이모TV YouTube channel (14 Harry Potter 마법사의돌 audiobook videos)
- **Goal**: Learning aid app — 0.75x audiobook player with synced Korean subtitles and learning science features

## Roadmap
- [x] Download all 14 HP videos + auto-generated Korean subs
- [x] Extract audio, convert to 0.75x speed MP3
- [x] Extract EPUB chapter text, align to auto-sub timestamps
- [x] Build Next.js web app with audiobook player
- [x] Implement 6 learning features (frequency, repetition, replay, progress, etc.)
- [ ] Final polish and testing

## File Map
- `originals/` — Raw downloaded videos (14 MP4 files)
- `audio/` — Extracted audio (M4A, original speed)
- `audio_slow/` — 0.75x speed audio (MP3, used by the app)
- `subs/` — Auto-generated subtitle files (SRT + json3 for timestamps)
- `subs_aligned/` — EPUB-aligned subtitles (*.app.json for the app, *.aligned.srt)
- `chapters/` — EPUB text per book chapter
- `chapters_aligned/` — EPUB text split per video
- `app/` — Next.js web app (the main deliverable)
- `app/public/audio/` — Symlinks to audio_slow MP3s
- `app/public/data/` — Aligned subtitle JSON + manifest
- `scripts/download.sh` — Downloads videos + subs via yt-dlp (needs Chrome cookies)
- `scripts/extract_epub.py` — Extracts chapter text from EPUB
- `scripts/align_subs.py` — V1 alignment (sliding window, superseded)
- `scripts/align_subs_v2.py` — V2 alignment (sequential fuzzy matching, used)
- `scripts/process_v1.sh` — FFmpeg: burn SRT subs into video
- `scripts/process_v2.py` — FFmpeg: karaoke ASS subs + text panel

## Setup & Run
```bash
# Run the app
cd app && npm run dev
# Opens at http://localhost:3000

# If starting fresh, run data pipeline first:
bash scripts/download.sh          # needs Chrome cookies for YouTube
python3 scripts/extract_epub.py   # extract EPUB chapters
python3 scripts/align_subs_v2.py  # align EPUB text to timestamps
```
Requires: node 18+, yt-dlp, ffmpeg, python3

## Learning Features (all implemented)
1. Phrase-level subtitles with auto-scroll (priming)
2. Frequency-based rare word highlighting (orange dotted underline)
3. Repetition markers (green dot + glow for repeated words)
4. Tap-to-replay any segment (narrow listening)
5. 10s rewind button for segment replay
6. Progress persistence (chapter, position, play counts)

## Notes
- Videos use Chrome cookies for download (`--cookies-from-browser chrome`)
- EPUB Section0033 is Book 2 preview — excluded from extraction
- EPUB sections are not in chapter order — matched by chapter title prefix
- Ch5/6 split into 2 videos each; Ch7+8 combined in one video
- Alignment quality varies: Ch3/Ch11 excellent, Ch6b/Ch9 weaker
