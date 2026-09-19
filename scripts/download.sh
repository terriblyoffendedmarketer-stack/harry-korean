#!/bin/bash
# download.sh — Downloads all Harry Potter Korean audiobook videos from 뭉이모TV
# Usage: bash scripts/download.sh
# Requires: yt-dlp
#
# Gotchas:
# - No playlist exists; videos are identified by ID from channel listing
# - Auto-generated Korean subs only (ko-orig); no manual subs available
# - json3 format needed for word-level timestamps (V2 karaoke effect)
# - SRT also downloaded for V1 standard subtitles

set -e

PROJ="/Users/apple/Documents/Claude Code/harry korean"
ORIG="$PROJ/originals"
SUBS="$PROJ/subs"

mkdir -p "$ORIG" "$SUBS"

# All Harry Potter videos from 뭉이모TV, ordered by chapter
# Ch1:  YYilRBu7gn4
# Ch2:  cpwoQmCJc8w
# Ch3:  H_IBugepBmk
# Ch4:  5PL7_Ycs4Ds
# Ch5a: Z9Qfk1yaBqM (다이애건 앨리)
# Ch5b: 40BlCO8UV70 (다이애건 앨리 2편)
# Ch6a: IjWGPw0Lbmo (9와 4분의 3 정거장)
# Ch6b: izQrvmtMhrM (9와 4분의 3 정거장 2편)
# Ch8:  60fo_Vr9QKg (8장 마법약 교수 + 7장)
# Ch9:  XF13L8x4QJ4
# Ch10: 9L5KVAlRU7U
# Ch11: nJtSd7lMAgE
# Ch12: Gf7l1QZ_H44
# Ch13: DxGt0S8pa1c

VIDEO_IDS=(
  "YYilRBu7gn4"
  "cpwoQmCJc8w"
  "H_IBugepBmk"
  "5PL7_Ycs4Ds"
  "Z9Qfk1yaBqM"
  "40BlCO8UV70"
  "IjWGPw0Lbmo"
  "izQrvmtMhrM"
  "60fo_Vr9QKg"
  "XF13L8x4QJ4"
  "9L5KVAlRU7U"
  "nJtSd7lMAgE"
  "Gf7l1QZ_H44"
  "DxGt0S8pa1c"
)

LABELS=(
  "01_ch01_살아남은아이"
  "02_ch02_사라진유리창"
  "03_ch03_발신자없는편지들"
  "04_ch04_숲지기"
  "05_ch05a_다이애건앨리"
  "06_ch05b_다이애건앨리2"
  "07_ch06a_정거장"
  "08_ch06b_정거장2"
  "09_ch07-08_기숙사배정_마법약교수"
  "10_ch09_한밤의결투"
  "11_ch10_핼러윈"
  "12_ch11_퀴디치"
  "13_ch12_이레지드거울"
  "14_ch13_니콜라플라멜"
)

echo "=== Downloading ${#VIDEO_IDS[@]} Harry Potter videos ==="
echo ""

for i in "${!VIDEO_IDS[@]}"; do
  vid="${VIDEO_IDS[$i]}"
  label="${LABELS[$i]}"
  echo "[$((i+1))/${#VIDEO_IDS[@]}] Downloading: $label ($vid)"

  # Download video
  if [ -f "$ORIG/${label}.mp4" ]; then
    echo "  Video already exists, skipping."
  else
    yt-dlp --cookies-from-browser chrome \
      -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" \
      --merge-output-format mp4 \
      -o "$ORIG/${label}.mp4" \
      "https://www.youtube.com/watch?v=${vid}" || {
      echo "  WARNING: Failed to download video $vid"
      continue
    }
  fi

  # Download SRT subtitles (for V1)
  if [ -f "$SUBS/${label}.ko-orig.srt" ]; then
    echo "  SRT subs already exist, skipping."
  else
    yt-dlp --cookies-from-browser chrome \
      --write-auto-sub --sub-lang "ko-orig" --sub-format srt \
      --skip-download \
      -o "$SUBS/${label}" \
      "https://www.youtube.com/watch?v=${vid}" 2>/dev/null || {
      echo "  WARNING: Failed to download SRT subs for $vid"
    }
  fi

  # Download json3 subtitles (for V2 word-level timestamps)
  if [ -f "$SUBS/${label}.ko-orig.json3" ]; then
    echo "  json3 subs already exist, skipping."
  else
    yt-dlp --cookies-from-browser chrome \
      --write-auto-sub --sub-lang "ko-orig" --sub-format json3 \
      --skip-download \
      -o "$SUBS/${label}" \
      "https://www.youtube.com/watch?v=${vid}" 2>/dev/null || {
      echo "  WARNING: Failed to download json3 subs for $vid"
    }
  fi

  echo "  Done."
  echo ""
done

echo "=== Download complete ==="
echo "Videos: $ORIG/"
echo "Subtitles: $SUBS/"
