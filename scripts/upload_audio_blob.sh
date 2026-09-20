#!/bin/bash
# upload_audio_blob.sh — Upload compressed audio to Vercel Blob
# Usage: bash scripts/upload_audio_blob.sh
# Run from project root. Requires: vercel CLI authenticated, project linked.
#
# Uploads each MP3 from audio_web/ to Vercel Blob with public access.
# Prints the blob URL for each file.

set -e
cd "$(dirname "$0")/.."

AUDIO_DIR="audio_web"
URLS_FILE="app/public/data/audio_urls.json"

echo "{"
first=true
for f in "$AUDIO_DIR"/*.mp3; do
  base=$(basename "$f")
  echo "Uploading: $base" >&2
  url=$(cd app && vercel blob put "audio/$base" --access public --allow-overwrite < "../$f" 2>/dev/null | grep -o 'https://[^ ]*')
  if [ "$first" = true ]; then
    first=false
  else
    echo ","
  fi
  echo "  \"$base\": \"$url\""
done
echo "}" | tee "$URLS_FILE"

echo "" >&2
echo "Audio URLs saved to $URLS_FILE" >&2
