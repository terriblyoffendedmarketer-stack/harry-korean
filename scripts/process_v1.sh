#!/bin/bash
# process_v1.sh — Slows videos to 0.75x and burns in Korean subtitles (standard)
# Usage: bash scripts/process_v1.sh
# Requires: ffmpeg
#
# Gotchas:
# - atempo filter only accepts 0.5-2.0 range, so 0.75 is fine in one pass
# - setpts=PTS/0.75 slows video; atempo=0.75 slows audio to match
# - SRT subs need timestamp scaling to match the slower playback
# - Subtitle font sized large for readability; yellow with black outline

set -e

PROJ="/Users/apple/Documents/Claude Code/harry korean"
ORIG="$PROJ/originals"
SUBS="$PROJ/subs"
OUT="$PROJ/v1"

mkdir -p "$OUT"

# First, scale SRT timestamps to 0.75x speed
scale_srt() {
  local input="$1"
  local output="$2"
  python3 -c "
import re, sys

def scale_time(match):
    h, m, s, ms = int(match.group(1)), int(match.group(2)), int(match.group(3)), int(match.group(4))
    total_ms = ((h * 3600 + m * 60 + s) * 1000 + ms)
    scaled = int(total_ms / 0.75)
    nh = scaled // 3600000
    nm = (scaled % 3600000) // 60000
    ns = (scaled % 60000) // 1000
    nms = scaled % 1000
    return f'{nh:02d}:{nm:02d}:{ns:02d},{nms:03d}'

with open('$input', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'(\d{2}):(\d{2}):(\d{2}),(\d{3})'
result = re.sub(pattern, scale_time, content)

with open('$output', 'w', encoding='utf-8') as f:
    f.write(result)
"
}

echo "=== Processing V1: 0.75x speed + standard subtitles ==="
echo ""

for video in "$ORIG"/*.mp4; do
  [ -f "$video" ] || continue
  base=$(basename "$video" .mp4)
  outfile="$OUT/${base}_v1.mp4"
  srt_orig="$SUBS/${base}.ko-orig.srt"
  srt_scaled="$SUBS/${base}.ko-orig.scaled.srt"

  if [ -f "$outfile" ]; then
    echo "[$base] Already processed, skipping."
    continue
  fi

  if [ ! -f "$srt_orig" ]; then
    echo "[$base] WARNING: No SRT file found, processing without subs."
    ffmpeg -i "$video" \
      -filter_complex "[0:v]setpts=PTS/0.75[v];[0:a]atempo=0.75[a]" \
      -map "[v]" -map "[a]" \
      -c:v libx264 -preset medium -crf 23 \
      -c:a aac -b:a 128k \
      "$outfile" -y
    continue
  fi

  echo "[$base] Scaling subtitles..."
  scale_srt "$srt_orig" "$srt_scaled"

  echo "[$base] Processing (0.75x + subs)..."
  ffmpeg -i "$video" \
    -filter_complex "[0:v]setpts=PTS/0.75,subtitles='${srt_scaled}':force_style='FontSize=24,FontName=AppleSDGothicNeo-Bold,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1,MarginV=30'[v];[0:a]atempo=0.75[a]" \
    -map "[v]" -map "[a]" \
    -c:v libx264 -preset medium -crf 23 \
    -c:a aac -b:a 128k \
    "$outfile" -y

  echo "[$base] Done -> $outfile"
  echo ""
done

echo "=== V1 processing complete ==="
echo "Output: $OUT/"
