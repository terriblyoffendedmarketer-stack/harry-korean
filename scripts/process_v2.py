#!/usr/bin/env python3
# process_v2.py — Creates V2 videos: 0.75x speed, karaoke-highlight subs, text panel on right
# Usage: python3 scripts/process_v2.py
# Requires: python3, ffmpeg
#
# Approach:
# - Parses json3 word-level timestamps from YouTube auto-subs
# - Generates ASS subtitle file with karaoke (\kf) tags for glow-as-you-go effect
# - Creates a layout: video on left (~70%), scrolling text panel on right (~30%)
# - The right panel shows upcoming/current text so you can read ahead
#
# Gotchas:
# - json3 events alternate between text events and newline events; filter newlines
# - Word offsets (tOffsetMs) are relative to the event's tStartMs
# - All timestamps must be scaled by /0.75 for the slower playback
# - ASS \kf tag uses centiseconds, not milliseconds
# - ffmpeg subtitles filter needs path escaping for special chars

import json
import os
import re
import subprocess
import sys
from pathlib import Path

PROJ = Path("/Users/apple/Documents/Claude Code/harry korean")
ORIG = PROJ / "originals"
SUBS = PROJ / "subs"
OUT = PROJ / "v2"
OUT.mkdir(exist_ok=True)

SPEED = 0.75

def ms_to_ass_time(ms):
    """Convert milliseconds to ASS timestamp format H:MM:SS.cc"""
    ms = max(0, int(ms))
    h = ms // 3600000
    m = (ms % 3600000) // 60000
    s = (ms % 60000) // 1000
    cs = (ms % 1000) // 10
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"

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

def generate_karaoke_ass(events, video_width, video_height):
    """Generate ASS subtitle file with karaoke highlighting for bottom subs
    and a scrolling text panel on the right side."""

    # Layout: video takes left 70%, text panel takes right 30%
    panel_width = int(video_width * 0.30)
    video_area_width = video_width - panel_width

    ass_header = f"""[Script Info]
Title: Harry Potter Korean Karaoke Subs
ScriptType: v4.00+
PlayResX: {video_width}
PlayResY: {video_height}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Karaoke,AppleSDGothicNeo-Bold,28,&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,2,10,{panel_width + 10},30,1
Style: PanelBG,Arial,1,&H00000000,&H00000000,&H00000000,&HCC1A1A2E,0,0,0,0,100,100,0,0,3,0,0,7,0,0,0,1
Style: PanelText,AppleSDGothicNeo-Regular,22,&H00CCCCCC,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,7,{video_area_width + 20},20,0,1
Style: PanelHighlight,AppleSDGothicNeo-Bold,23,&H0000DDFF,&H0000FFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,1,0,7,{video_area_width + 20},20,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    lines = []

    # Draw the right panel background (a tall semi-transparent box)
    panel_x = video_area_width
    # Persistent background drawn as a shape
    lines.append(
        f"Dialogue: 0,0:00:00.00,9:00:00.00,PanelBG,,0,0,0,,"
        f"{{\\pos({panel_x},{video_height // 2})\\p1}}m 0 -{video_height // 2} "
        f"l {panel_width} -{video_height // 2} "
        f"{panel_width} {video_height // 2} "
        f"0 {video_height // 2}{{\\p0}}"
    )

    # Panel title
    lines.append(
        f"Dialogue: 1,0:00:00.00,9:00:00.00,PanelHighlight,,{video_area_width + 20},20,15,,"
        f"{{\\an7\\fs18\\b1}}📖 본문 텍스트"
    )

    # Generate karaoke lines (bottom of video area)
    for ev in events:
        start_scaled = ev['start_ms'] / SPEED
        end_scaled = (ev['start_ms'] + ev['duration_ms']) / SPEED
        start_t = ms_to_ass_time(start_scaled)
        end_t = ms_to_ass_time(end_scaled)

        karaoke_text = ""
        for j, word in enumerate(ev['words']):
            word_start = word['offset_ms']
            if j + 1 < len(ev['words']):
                word_dur = ev['words'][j + 1]['offset_ms'] - word_start
            else:
                word_dur = ev['duration_ms'] - word_start

            word_dur_scaled = word_dur / SPEED
            kf_cs = max(1, int(word_dur_scaled / 10))
            w_text = word['text'].replace('\\', '\\\\').replace('{', '\\{').replace('}', '\\}')
            karaoke_text += f"{{\\kf{kf_cs}}}{w_text}"

        lines.append(f"Dialogue: 2,{start_t},{end_t},Karaoke,,0,0,0,,{karaoke_text}")

    # Generate right-panel text blocks
    # Group events into chunks of ~6 lines for the panel display
    chunk_size = 6
    for i in range(0, len(events), chunk_size):
        chunk = events[i:i + chunk_size]
        chunk_start = chunk[0]['start_ms'] / SPEED
        chunk_end = (chunk[-1]['start_ms'] + chunk[-1]['duration_ms']) / SPEED
        # Extend display time a bit so text stays visible
        chunk_end = max(chunk_end, chunk_start + 8000)

        start_t = ms_to_ass_time(chunk_start)
        end_t = ms_to_ass_time(chunk_end)

        panel_lines = []
        for ci, ev in enumerate(chunk):
            ev_start = ev['start_ms'] / SPEED
            ev_end = (ev['start_ms'] + ev['duration_ms']) / SPEED

            text = ev['text'].replace('\\', '\\\\').replace('{', '\\{').replace('}', '\\}')
            panel_lines.append(text)

        panel_text = "\\N".join(panel_lines)

        # Show current chunk's text at a vertical position that scrolls
        y_pos = 45 + (i % 3) * 0  # fixed position, text replaces
        lines.append(
            f"Dialogue: 1,{start_t},{end_t},PanelText,,0,0,{y_pos},,"
            f"{{\\an7}}{panel_text}"
        )

        # Highlight the currently-spoken line within the chunk
        for ci, ev in enumerate(chunk):
            ev_start_scaled = ev['start_ms'] / SPEED
            ev_end_scaled = (ev['start_ms'] + ev['duration_ms']) / SPEED
            ev_start_t = ms_to_ass_time(ev_start_scaled)
            ev_end_t = ms_to_ass_time(ev_end_scaled)
            text = ev['text'].replace('\\', '\\\\').replace('{', '\\{').replace('}', '\\}')

            # Position the highlight at the same line position
            highlight_y = 45 + ci * 28
            lines.append(
                f"Dialogue: 2,{ev_start_t},{ev_end_t},PanelHighlight,,0,0,{highlight_y},,"
                f"{{\\an7}}{text}"
            )

    return ass_header + "\n".join(lines) + "\n"


def process_video(video_path, json3_path, output_path):
    """Process a single video: slow to 0.75x, add karaoke subs + text panel."""
    print(f"  Parsing subtitles...")
    events = parse_json3(json3_path)
    print(f"  Found {len(events)} subtitle events")

    # Get video dimensions
    result = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0',
         '-show_entries', 'stream=width,height',
         '-of', 'csv=p=0', str(video_path)],
        capture_output=True, text=True
    )
    w, h = result.stdout.strip().split(',')
    orig_w, orig_h = int(w), int(h)

    # Output is wider to accommodate the text panel
    # Video stays at original size, panel added to the right
    panel_width = int(orig_w * 0.42)  # ~42% extra width for readable text
    out_w = orig_w + panel_width
    out_h = orig_h

    print(f"  Video: {orig_w}x{orig_h} -> Output: {out_w}x{out_h}")

    ass_content = generate_karaoke_ass(events, out_w, out_h)
    ass_path = str(json3_path).replace('.json3', '.v2.ass')
    with open(ass_path, 'w', encoding='utf-8') as f:
        f.write(ass_content)
    print(f"  Generated ASS file: {ass_path}")

    # Escape the ASS path for ffmpeg subtitle filter
    ass_escaped = ass_path.replace("'", "'\\''").replace(":", "\\:").replace("[", "\\[").replace("]", "\\]")

    print(f"  Encoding (this may take a while)...")
    cmd = [
        'ffmpeg', '-i', str(video_path),
        '-filter_complex',
        f"[0:v]setpts=PTS/{SPEED},scale={orig_w}:{orig_h}[vid];"
        f"color=c=#1A1A2E:s={panel_width}x{out_h}:d=36000[panel];"
        f"[vid][panel]hstack=inputs=2[canvas];"
        f"[canvas]ass='{ass_escaped}'[out];"
        f"[0:a]atempo={SPEED}[aout]",
        '-map', '[out]', '-map', '[aout]',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
        '-c:a', 'aac', '-b:a', '128k',
        str(output_path), '-y'
    ]

    subprocess.run(cmd, check=True)
    print(f"  Done -> {output_path}")


def main():
    print("=== Processing V2: 0.75x speed + karaoke subs + text panel ===\n")

    videos = sorted(ORIG.glob("*.mp4"))
    if not videos:
        print("No videos found in originals/. Run download.sh first.")
        sys.exit(1)

    for video in videos:
        base = video.stem
        output = OUT / f"{base}_v2.mp4"
        json3 = SUBS / f"{base}.ko-orig.json3"

        if output.exists():
            print(f"[{base}] Already processed, skipping.")
            continue

        if not json3.exists():
            print(f"[{base}] WARNING: No json3 file found, skipping V2.")
            continue

        print(f"[{base}] Processing...")
        try:
            process_video(video, json3, output)
        except Exception as e:
            print(f"[{base}] ERROR: {e}")
            if output.exists():
                output.unlink()

        print()

    print("=== V2 processing complete ===")
    print(f"Output: {OUT}/")


if __name__ == '__main__':
    main()
