#!/bin/sh
# Converts screenshots to what the Chrome Web Store accepts: 1280x800, 24-bit PNG, no alpha channel.
# The image is scaled to fit and centred on a white background (never stretched or cropped).
# Usage: scripts/store-screenshot.sh in1.png [in2.png ...]   -> writes docs/store-assets/screenshot-N-1280x800.png
set -e
out=docs/store-assets
mkdir -p "$out"
n=1
for f in "$@"; do
  magick "$f" -background white -alpha remove -alpha off -resize 1280x800 \
    -gravity center -extent 1280x800 -depth 8 "PNG24:$out/screenshot-$n-1280x800.png"
  echo "wrote $out/screenshot-$n-1280x800.png ($(magick identify -format '%wx%h %[channels]' "$out/screenshot-$n-1280x800.png"))"
  n=$((n + 1))
done
