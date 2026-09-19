#!/usr/bin/env python3
# align_subs_v2.py — Improved alignment of EPUB text with auto-sub timestamps
# Usage: python3 scripts/align_subs_v2.py
# Requires: python3
#
# Improvements over v1:
# - Uses character-level alignment instead of segment-level sliding window
# - Streams through EPUB text sequentially, matching auto-sub chunks
# - Much larger search windows for better coverage
# - Handles the "channel intro" segments (뭉이모TV) by skipping them
# - Better handling of split chapters (5a/5b, 6a/6b)
#
# Gotchas:
# - The EPUB chapter splits for videos don't always align perfectly
#   (the uploader may not read exactly half the chapter per video)
# - Some videos include channel intros/outros not in the book text
# - Korean auto-subs sometimes hallucinate or repeat text

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

SPEED = 0.75


def normalize(text):
    text = re.sub(r'[.,!?;:"""\'\'「」『』（）()\[\]…·~\-–—>><<♪♫★☆]', '', text)
    text = re.sub(r'\s+', '', text)
    return text


def parse_json3(filepath):
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
            words.append({'text': utf8, 'offset_ms': offset})

        if words:
            events.append({
                'start_ms': t_start,
                'duration_ms': duration,
                'words': words,
                'text': text
            })
    return events


def is_channel_intro(text):
    """Detect channel intro/outro segments that aren't in the book."""
    patterns = [
        r'모이모\s*TV', r'뭉이모\s*TV', r'구독', r'좋아요', r'눌러',
        r'주세요$', r'Moongimo', r'♪', r'♫'
    ]
    for p in patterns:
        if re.search(p, text, re.IGNORECASE):
            return True
    return False


def build_char_map(text):
    """Build mapping from normalized char positions back to original positions."""
    norm_chars = []
    norm_to_orig = []
    for i, ch in enumerate(text):
        n = normalize(ch)
        if n:
            norm_chars.append(n)
            norm_to_orig.append(i)
    return ''.join(norm_chars), norm_to_orig


def find_best_match(query_norm, epub_norm, search_start, search_end):
    """Find the best matching position for query in epub_norm[search_start:search_end].
    Returns (start_pos, end_pos, ratio) in epub_norm coordinates."""
    if not query_norm or len(query_norm) < 2:
        return None

    best_ratio = 0
    best_start = -1
    best_end = -1

    region = epub_norm[search_start:search_end]
    qlen = len(query_norm)

    # Try different match lengths
    for try_len in range(max(2, qlen - 8), qlen + 12):
        if try_len > len(region):
            break
        # Step through the region
        step = max(1, try_len // 4)
        for pos in range(0, len(region) - try_len + 1, step):
            candidate = region[pos:pos + try_len]
            # Quick pre-check: first few chars should partially match
            if qlen > 4 and candidate[:3] != query_norm[:3]:
                # Check if at least some overlap
                if candidate[:2] != query_norm[:2] and candidate[1:3] != query_norm[:2]:
                    continue

            ratio = SequenceMatcher(None, query_norm, candidate, autojunk=False).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
                best_start = search_start + pos
                best_end = search_start + pos + try_len

    # Refine: try positions around the best with finer granularity
    if best_start >= 0 and best_ratio > 0.3:
        refine_start = max(search_start, best_start - 5)
        refine_end = min(search_end, best_end + 5)
        for try_len in range(max(2, qlen - 3), qlen + 5):
            for pos in range(refine_start, min(refine_end, len(epub_norm) - try_len + 1)):
                candidate = epub_norm[pos:pos + try_len]
                ratio = SequenceMatcher(None, query_norm, candidate, autojunk=False).ratio()
                if ratio > best_ratio:
                    best_ratio = ratio
                    best_start = pos
                    best_end = pos + try_len

    if best_ratio > 0.35:
        return (best_start, best_end, best_ratio)
    return None


def align_sequential(events, epub_text):
    """Align events sequentially through the EPUB text."""
    epub_norm, norm_to_orig = build_char_map(epub_text)

    aligned = []
    cursor = 0  # Current position in epub_norm

    for i, ev in enumerate(events):
        auto_text = ev['text']

        # Skip channel intros
        if is_channel_intro(auto_text):
            aligned.append({**ev, 'epub_text': '', 'confidence': -1})
            continue

        query_norm = normalize(auto_text)
        if not query_norm or len(query_norm) < 2:
            aligned.append({**ev, 'epub_text': auto_text, 'confidence': 0})
            continue

        # Search window: primarily forward from cursor, some backtrack
        back = min(cursor, 100)
        search_start = cursor - back
        # Forward window proportional to remaining text
        forward = min(len(query_norm) * 10, 800, len(epub_norm) - cursor + back)
        search_end = min(len(epub_norm), search_start + forward)

        match = find_best_match(query_norm, epub_norm, search_start, search_end)

        if match:
            m_start, m_end, ratio = match
            # Map back to original text
            orig_start = norm_to_orig[m_start] if m_start < len(norm_to_orig) else 0
            orig_end = norm_to_orig[min(m_end - 1, len(norm_to_orig) - 1)] + 1 if m_end > 0 else len(epub_text)
            epub_match = epub_text[orig_start:orig_end].strip()

            # Advance cursor
            cursor = m_end

            aligned.append({**ev, 'epub_text': epub_match, 'confidence': ratio})
        else:
            # Try a wider search as fallback
            wide_start = max(0, cursor - 200)
            wide_end = min(len(epub_norm), cursor + 1500)
            match = find_best_match(query_norm, epub_norm, wide_start, wide_end)

            if match:
                m_start, m_end, ratio = match
                orig_start = norm_to_orig[m_start] if m_start < len(norm_to_orig) else 0
                orig_end = norm_to_orig[min(m_end - 1, len(norm_to_orig) - 1)] + 1 if m_end > 0 else len(epub_text)
                epub_match = epub_text[orig_start:orig_end].strip()
                cursor = m_end
                aligned.append({**ev, 'epub_text': epub_match, 'confidence': ratio})
            else:
                aligned.append({**ev, 'epub_text': auto_text, 'confidence': 0})

    return aligned


def merge_short_segments(aligned):
    """Merge very short aligned segments into their neighbors for readability."""
    if not aligned:
        return aligned

    merged = [aligned[0]]
    for ev in aligned[1:]:
        prev = merged[-1]
        # Merge if previous segment is very short and same confidence band
        if (len(prev.get('epub_text', '')) < 4 and
            prev.get('confidence', 0) >= 0 and
            ev.get('confidence', 0) >= 0):
            # Merge into current
            merged[-1] = {
                **ev,
                'start_ms': prev['start_ms'],
                'duration_ms': (ev['start_ms'] + ev['duration_ms']) - prev['start_ms'],
                'epub_text': (prev.get('epub_text', '') + ' ' + ev.get('epub_text', '')).strip(),
                'confidence': min(prev.get('confidence', 0), ev.get('confidence', 0))
            }
        else:
            merged.append(ev)

    return merged


def generate_srt(aligned_events):
    """Generate SRT with timestamps scaled to 0.75x speed."""
    lines = []
    idx = 1
    for ev in aligned_events:
        text = ev.get('epub_text', '').strip()
        if not text or ev.get('confidence', 0) < 0:
            continue

        start_ms = int(ev['start_ms'] / SPEED)
        end_ms = int((ev['start_ms'] + ev['duration_ms']) / SPEED)

        def fmt(ms):
            h = ms // 3600000
            m = (ms % 3600000) // 60000
            s = (ms % 60000) // 1000
            r = ms % 1000
            return f"{h:02d}:{m:02d}:{s:02d},{r:03d}"

        lines.append(str(idx))
        lines.append(f"{fmt(start_ms)} --> {fmt(end_ms)}")
        lines.append(text)
        lines.append('')
        idx += 1
    return '\n'.join(lines)


def generate_app_json(aligned_events, base_name):
    """Generate JSON for the web app with all timing and text data."""
    segments = []
    for ev in aligned_events:
        text = ev.get('epub_text', '').strip()
        if not text or ev.get('confidence', 0) < 0:
            continue

        start_s = ev['start_ms'] / 1000.0 / SPEED
        end_s = (ev['start_ms'] + ev['duration_ms']) / 1000.0 / SPEED
        segments.append({
            'start': round(start_s, 3),
            'end': round(end_s, 3),
            'text': text,
            'confidence': round(ev.get('confidence', 0), 2)
        })

    return {
        'id': base_name,
        'segments': segments
    }


def main():
    print("=== Improved Alignment v2 ===\n")

    json3_files = sorted(SUBS.glob("*.ko-orig.json3"))
    json3_files = [f for f in json3_files if 'YYilRBu7gn4' not in f.name]

    all_chapters = []

    for json3_file in json3_files:
        base = json3_file.name.replace('.ko-orig.json3', '')
        chapter_file = CHAPTERS / f"{base}.txt"

        if not chapter_file.exists():
            print(f"[{base}] No chapter file, skipping.")
            continue

        print(f"[{base}]")
        events = parse_json3(json3_file)
        print(f"  {len(events)} auto-sub segments")

        with open(chapter_file, 'r', encoding='utf-8') as f:
            epub_text = f.read().strip()
        print(f"  {len(epub_text)} chars EPUB text")

        aligned = align_sequential(events, epub_text)
        aligned = merge_short_segments(aligned)

        high = sum(1 for a in aligned if a.get('confidence', 0) > 0.6)
        med = sum(1 for a in aligned if 0.35 < a.get('confidence', 0) <= 0.6)
        low = sum(1 for a in aligned if 0 <= a.get('confidence', 0) <= 0.35)
        skip = sum(1 for a in aligned if a.get('confidence', 0) < 0)
        print(f"  Results: {high} high, {med} medium, {low} low, {skip} skipped")

        # Save SRT
        srt = generate_srt(aligned)
        srt_path = OUT / f"{base}.aligned.srt"
        with open(srt_path, 'w', encoding='utf-8') as f:
            f.write(srt)

        # Save app JSON
        app_data = generate_app_json(aligned, base)
        json_path = OUT / f"{base}.app.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(app_data, f, ensure_ascii=False, indent=2)

        all_chapters.append(app_data)

        # Show samples
        good = [a for a in aligned if a.get('confidence', 0) > 0.5]
        if good:
            print(f"  Samples:")
            for s in [good[0], good[len(good)//3], good[len(good)//2]]:
                print(f"    [{s['confidence']:.2f}] {s['epub_text'][:60]}")
        print()

    # Save combined manifest for the app
    manifest_path = OUT / "manifest.json"
    chapter_meta = []
    for ch in all_chapters:
        ch_id = ch['id']
        # Parse chapter info from filename
        parts = ch_id.split('_', 2)
        num = parts[0]
        chapter_meta.append({
            'id': ch_id,
            'file': f"{ch_id}.app.json",
            'audio': f"{ch_id}.mp3",
            'title': ch_id.replace('_', ' '),
            'segments': len(ch['segments'])
        })

    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump({
            'title': '해리 포터와 마법사의 돌',
            'chapters': chapter_meta
        }, f, ensure_ascii=False, indent=2)

    print(f"Saved manifest: {manifest_path}")
    print(f"\n=== Done ===")


if __name__ == '__main__':
    main()
