#!/usr/bin/env python3
# align_subs.py — Aligns EPUB text with auto-generated subtitle timestamps
# Usage: python3 scripts/align_subs.py
# Requires: python3
#
# Strategy:
# - Auto-subs give us timestamps but inaccurate text
# - EPUB gives us accurate text but no timestamps
# - We use sequence alignment (similar to diff) to map auto-sub segments
#   to EPUB text positions, then replace the auto-sub text with EPUB text
#   while keeping the timestamps
#
# Gotchas:
# - Auto-subs often merge/split words differently than the EPUB
# - Korean has no spaces between some words in auto-subs
# - Must normalize whitespace and punctuation for matching
# - Some auto-sub segments are pure noise (music notes, sound effects)
# - The alignment uses a sliding window approach: for each auto-sub segment,
#   find the best matching position in the EPUB text near the expected position

import json
import re
import os
from pathlib import Path
from difflib import SequenceMatcher

PROJ = Path("/Users/apple/Documents/Claude Code/harry korean")
SUBS = PROJ / "subs"
CHAPTERS = PROJ / "chapters_aligned"
OUT = PROJ / "subs_aligned"
OUT.mkdir(exist_ok=True)


def normalize(text):
    """Normalize text for comparison: remove punctuation, collapse whitespace."""
    text = re.sub(r'[.,!?;:"""\'\'「」『』（）()\[\]…·~\-–—]', '', text)
    text = re.sub(r'\s+', '', text)
    return text.lower()


def parse_json3(filepath):
    """Parse json3 subtitle file into events with word-level timing."""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    events = []
    for ev in data.get('events', []):
        segs = ev.get('segs', [])
        if not segs:
            continue
        text = ''.join(s.get('utf8', '') for s in segs).strip()
        if not text or text == '\n':
            continue

        t_start = ev.get('tStartMs', 0)
        duration = ev.get('dDurationMs', 0)

        words = []
        for seg in segs:
            utf8 = seg.get('utf8', '')
            if not utf8 or utf8 == '\n':
                continue
            offset = seg.get('tOffsetMs', 0)
            words.append({
                'text': utf8,
                'offset_ms': offset
            })

        if words:
            events.append({
                'start_ms': t_start,
                'duration_ms': duration,
                'words': words,
                'text': text
            })

    return events


def load_epub_text(filepath):
    """Load EPUB chapter text and return as a single string + paragraph list."""
    with open(filepath, 'r', encoding='utf-8') as f:
        paragraphs = [line.strip() for line in f if line.strip()]
    full_text = ' '.join(paragraphs)
    return full_text, paragraphs


def align_events_to_epub(events, epub_text, epub_paragraphs):
    """Align auto-sub events to EPUB text using sliding window fuzzy matching.

    Returns a list of aligned events with EPUB text replacing auto-sub text,
    while preserving the original timestamps.
    """
    epub_normalized = normalize(epub_text)
    epub_chars = list(epub_text)

    # Build a character position map: normalized position -> original position
    norm_to_orig = []
    orig_pos = 0
    for ch in epub_text:
        n = normalize(ch)
        if n:
            norm_to_orig.append(orig_pos)
        orig_pos += 1

    aligned_events = []
    search_start = 0  # Track position in normalized EPUB text

    for i, ev in enumerate(events):
        auto_text = ev['text']
        auto_norm = normalize(auto_text)

        if not auto_norm or len(auto_norm) < 2:
            # Skip very short or empty segments
            aligned_events.append({
                **ev,
                'epub_text': auto_text,
                'confidence': 0.0
            })
            continue

        # Search window: look ahead from current position, with some backtrack
        window_back = min(search_start, 50)
        window_start = search_start - window_back
        # Look ahead proportionally - but cap it
        window_size = min(len(auto_norm) * 8, 500)
        window_end = min(len(epub_normalized), window_start + window_size)

        best_ratio = 0
        best_pos = -1
        best_len = len(auto_norm)
        search_text = epub_normalized[window_start:window_end]

        # Try different lengths around the auto-sub length
        for try_len in range(max(2, len(auto_norm) - 5), len(auto_norm) + 10):
            for pos in range(0, len(search_text) - try_len + 1):
                candidate = search_text[pos:pos + try_len]
                ratio = SequenceMatcher(None, auto_norm, candidate).ratio()
                if ratio > best_ratio:
                    best_ratio = ratio
                    best_pos = window_start + pos
                    best_len = try_len

        if best_ratio > 0.4 and best_pos >= 0:
            # Map back to original text positions
            orig_start = norm_to_orig[best_pos] if best_pos < len(norm_to_orig) else 0
            orig_end_idx = min(best_pos + best_len, len(norm_to_orig) - 1)
            orig_end = norm_to_orig[orig_end_idx] + 1 if orig_end_idx < len(norm_to_orig) else len(epub_text)

            epub_match = epub_text[orig_start:orig_end].strip()

            # Advance search position
            search_start = best_pos + best_len

            aligned_events.append({
                **ev,
                'epub_text': epub_match,
                'confidence': best_ratio
            })
        else:
            # No good match found — keep auto-sub text
            aligned_events.append({
                **ev,
                'epub_text': auto_text,
                'confidence': 0.0
            })

    return aligned_events


def generate_srt(aligned_events, speed=0.75):
    """Generate SRT subtitle file from aligned events, scaled to playback speed."""
    lines = []
    idx = 1

    for ev in aligned_events:
        start_ms = int(ev['start_ms'] / speed)
        end_ms = int((ev['start_ms'] + ev['duration_ms']) / speed)
        text = ev['epub_text']

        if not text.strip():
            continue

        start_h = start_ms // 3600000
        start_m = (start_ms % 3600000) // 60000
        start_s = (start_ms % 60000) // 1000
        start_ms_r = start_ms % 1000

        end_h = end_ms // 3600000
        end_m = (end_ms % 3600000) // 60000
        end_s = (end_ms % 60000) // 1000
        end_ms_r = end_ms % 1000

        lines.append(str(idx))
        lines.append(
            f"{start_h:02d}:{start_m:02d}:{start_s:02d},{start_ms_r:03d} --> "
            f"{end_h:02d}:{end_m:02d}:{end_s:02d},{end_ms_r:03d}"
        )
        lines.append(text)
        lines.append('')
        idx += 1

    return '\n'.join(lines)


def generate_aligned_json3(aligned_events, speed=0.75):
    """Generate a modified json3-like structure with EPUB text and scaled timestamps.
    Used by the V2 processor for word-level karaoke."""
    result = []
    for ev in aligned_events:
        # For word-level timing, we distribute the duration evenly across
        # the characters of the EPUB text, since we can't get word-level
        # alignment from the EPUB
        epub_text = ev['epub_text']
        start_ms = ev['start_ms']
        duration_ms = ev['duration_ms']

        if not epub_text.strip():
            continue

        # Split EPUB text into word-like chunks (Korean spacing)
        words = epub_text.split()
        if not words:
            words = [epub_text]

        total_chars = sum(len(w) for w in words)
        if total_chars == 0:
            continue

        word_entries = []
        elapsed = 0
        for w in words:
            word_dur = int(duration_ms * len(w) / total_chars)
            word_entries.append({
                'text': w + ' ',
                'offset_ms': elapsed
            })
            elapsed += word_dur

        result.append({
            'start_ms': start_ms,
            'duration_ms': duration_ms,
            'words': word_entries,
            'text': epub_text,
            'confidence': ev.get('confidence', 0)
        })

    return result


def main():
    print("=== Aligning EPUB text with auto-generated subtitle timestamps ===\n")

    # Process each video's subtitles
    json3_files = sorted(SUBS.glob("*.ko-orig.json3"))
    # Skip the old test file
    json3_files = [f for f in json3_files if 'YYilRBu7gn4' not in f.name]

    for json3_file in json3_files:
        base = json3_file.name.replace('.ko-orig.json3', '')
        chapter_file = CHAPTERS / f"{base}.txt"

        if not chapter_file.exists():
            print(f"[{base}] No matching chapter file, skipping.")
            continue

        print(f"[{base}]")
        print(f"  Loading auto-subs...")
        events = parse_json3(json3_file)
        print(f"  {len(events)} subtitle segments")

        print(f"  Loading EPUB text...")
        epub_text, epub_paragraphs = load_epub_text(chapter_file)
        print(f"  {len(epub_paragraphs)} paragraphs, {len(epub_text)} chars")

        print(f"  Aligning...")
        aligned = align_events_to_epub(events, epub_text, epub_paragraphs)

        # Stats
        high_conf = sum(1 for a in aligned if a['confidence'] > 0.6)
        med_conf = sum(1 for a in aligned if 0.4 < a['confidence'] <= 0.6)
        low_conf = sum(1 for a in aligned if a['confidence'] <= 0.4)
        print(f"  Alignment: {high_conf} high, {med_conf} medium, {low_conf} low confidence")

        # Generate SRT (for V1)
        srt_content = generate_srt(aligned)
        srt_path = OUT / f"{base}.aligned.srt"
        with open(srt_path, 'w', encoding='utf-8') as f:
            f.write(srt_content)
        print(f"  Saved: {srt_path.name}")

        # Generate aligned json3 (for V2)
        aligned_json = generate_aligned_json3(aligned)
        json_path = OUT / f"{base}.aligned.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(aligned_json, f, ensure_ascii=False, indent=2)
        print(f"  Saved: {json_path.name}")

        # Show a few examples of alignment quality
        print(f"  Sample alignments:")
        for j in [0, 1, 2, len(aligned)//2, len(aligned)//2+1]:
            if j < len(aligned):
                a = aligned[j]
                conf = a['confidence']
                auto = a['text'][:40]
                epub = a['epub_text'][:40]
                print(f"    [{conf:.2f}] auto: {auto}")
                print(f"           epub: {epub}")

        print()

    print("=== Alignment complete ===")
    print(f"Aligned SRT files: {OUT}/")


if __name__ == '__main__':
    main()
