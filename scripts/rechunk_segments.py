# rechunk_segments.py — Merge subtitle fragments into natural sentences
# Usage: python3 scripts/rechunk_segments.py
# Reads: subs_aligned/*.app.json (originals)
# Writes: app/public/data/*.app.json
#
# Merges all fragment text into one string with timing anchors, then splits
# at sentence boundaries found WITHIN the merged text (not just at fragment ends).
# This handles cases where a sentence ends in the middle of a fragment.

import json
import re
from pathlib import Path

SUBS_ALIGNED = Path("subs_aligned")
APP_DATA = Path("app/public/data")

MAX_SEGMENT_S = 14.0
MIN_SEGMENT_S = 1.5
MAX_CHARS = 35

SENTENCE_END = re.compile(
    r'(?:'
    # Punctuation after Korean char, followed by space/newline or end
    r'(?<=[가-힣])[.!?…]+[""\']?(?=\s|$)'
    r'|'
    # Common verb/adjective endings followed by space (no punctuation needed)
    r'(?:었다|았다|였다|했다|졌다|렸다|왔다|갔다|냈다|쳤다|봤다|줬다|됐다|셨다'
    r'|한다|된다|온다|운다|인다|간다|난다'
    r'|이다|였다|겠다|란다'
    r'|했어|었어|겠지|거야'
    r'|습니다|ㅂ니다'
    r'|세요|해요|에요|지요|군요'
    r'|니까|거든)(?=\s)'
    r')',
    re.UNICODE
)


def merge_and_split(fragments):
    """Merge all fragments, build timing map, split at sentence boundaries."""
    if not fragments:
        return []

    # Build merged text with timing anchors
    # Each anchor: (char_start, char_end, time_start, time_end) in merged text
    anchors = []
    merged = ""

    for i, frag in enumerate(fragments):
        text = frag["text"].strip()
        if not text:
            continue
        if merged:
            merged += " "
        c_start = len(merged)
        merged += text
        c_end = len(merged)

        t_start = frag["start"]
        t_end = fragments[i + 1]["start"] if i + 1 < len(fragments) else frag["end"]
        anchors.append((c_start, c_end, t_start, t_end))

    if not merged or not anchors:
        return []

    def char_to_time(pos):
        """Interpolate time for a character position."""
        pos = max(0, min(pos, len(merged)))
        for (cs, ce, ts, te) in anchors:
            if pos <= ce:
                if ce == cs:
                    return ts
                frac = max(0, min(1, (pos - cs) / (ce - cs)))
                return ts + frac * (te - ts)
        return anchors[-1][3]

    # Find all sentence break positions
    breaks = []
    for m in SENTENCE_END.finditer(merged):
        breaks.append(m.end())

    # Deduplicate and sort
    breaks = sorted(set(breaks))

    # If no breaks found, try splitting at punctuation more aggressively
    if not breaks:
        for m in re.finditer(r'[.!?]\s', merged):
            breaks.append(m.end())
        breaks = sorted(set(breaks))

    # Add end of text
    if not breaks or breaks[-1] < len(merged):
        breaks.append(len(merged))

    # Build segments
    segments = []
    start = 0
    for brk in breaks:
        text = merged[start:brk].strip()
        if not text:
            start = brk
            continue

        t_start = char_to_time(start)
        t_end = char_to_time(brk)
        if t_end <= t_start:
            t_end = t_start + 0.5

        segments.append({
            "start": round(t_start, 3),
            "end": round(t_end, 3),
            "text": text,
            "confidence": 1.0
        })
        start = brk

    return segments


CLAUSE_BREAK = re.compile(
    r'(?:'
    r',\s'
    r'|'
    r'(?:면서|하며|으며|지만|는데|ㄴ데|런데|서는|에서|니까|어서|아서|려고|도록|든지)\s'
    r')',
    re.UNICODE
)


def _find_split_points(text, min_edge=5):
    """Find candidate split positions in text, ranked by quality."""
    splits = []
    for m in SENTENCE_END.finditer(text):
        p = m.end()
        if min_edge < p < len(text) - min_edge:
            splits.append(('sentence', p))
    for m in CLAUSE_BREAK.finditer(text):
        p = m.end()
        if min_edge < p < len(text) - min_edge:
            splits.append(('clause', p))
    for m in re.finditer(r'\s', text):
        p = m.end()
        if min_edge < p < len(text) - min_edge:
            splits.append(('space', p))
    return splits


def _split_seg(seg, target_pos):
    """Split a segment at a character position, interpolating time."""
    text = seg["text"]
    dur = seg["end"] - seg["start"]
    frac = target_pos / len(text)
    split_t = seg["start"] + frac * dur
    p1 = {"start": seg["start"], "end": round(split_t, 3),
           "text": text[:target_pos].strip(), "confidence": 1.0}
    p2 = {"start": round(split_t, 3), "end": seg["end"],
           "text": text[target_pos:].strip(), "confidence": 1.0}
    return p1, p2


def split_long(segments):
    """Recursively split segments that are too long (by time or char count)."""
    result = []
    for seg in segments:
        text = seg["text"]
        dur = seg["end"] - seg["start"]
        too_long_time = dur > MAX_SEGMENT_S
        too_long_chars = len(text) > MAX_CHARS

        if not too_long_time and not too_long_chars:
            result.append(seg)
            continue

        splits = _find_split_points(text)
        if not splits:
            result.append(seg)
            continue

        mid = len(text) // 2
        # Prefer clause/sentence breaks near the middle; space as fallback
        rank = {'sentence': 0, 'clause': 1, 'space': 2}
        best_pos = min(splits, key=lambda sp: (rank[sp[0]], abs(sp[1] - mid)))[1]
        p1, p2 = _split_seg(seg, best_pos)

        result.extend(split_long([p1]))
        result.extend(split_long([p2]))
    return result


def merge_short(segments):
    """Merge segments < MIN_SEGMENT_S with the next."""
    result = []
    i = 0
    while i < len(segments):
        seg = dict(segments[i])
        dur = seg["end"] - seg["start"]
        if dur < MIN_SEGMENT_S and i + 1 < len(segments):
            nxt = segments[i + 1]
            seg["text"] = seg["text"] + " " + nxt["text"]
            seg["end"] = nxt["end"]
            i += 2
        else:
            i += 1
        result.append(seg)
    return result


def rechunk(orig_path):
    """Full rechunk pipeline for one chapter."""
    with open(orig_path) as f:
        data = json.load(f)
    frags = data["segments"]
    if not frags:
        return data

    segs = merge_and_split(frags)
    segs = split_long(segs)
    segs = merge_short(segs)

    data["segments"] = segs
    return data


def main():
    print("=== Rechunking: sentence-level subtitle segments ===\n")

    for jp in sorted(SUBS_ALIGNED.glob("*.app.json")):
        base = jp.stem.replace(".app", "")
        out = APP_DATA / jp.name

        with open(jp) as f:
            n_old = len(json.load(f)["segments"])

        data = rechunk(jp)
        segs = data["segments"]
        durs = [s["end"] - s["start"] for s in segs]

        print(f"[{base}]  {n_old} → {len(segs)}  "
              f"(avg {sum(durs)/len(durs):.1f}s, max {max(durs):.1f}s)")
        for s in segs[:3]:
            d = s["end"] - s["start"]
            t = s["text"][:70] + ("..." if len(s["text"]) > 70 else "")
            print(f"  {s['start']:7.1f}-{s['end']:7.1f} ({d:4.1f}s) {t}")
        print()

        with open(out, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    print("Done!")


if __name__ == "__main__":
    main()
