#!/usr/bin/env bash
# Build a Chrome Web Store-ready zip of the extension.
set -euo pipefail

cd "$(dirname "$0")/.."

OUT_DIR="dist"
OUT_FILE="$OUT_DIR/copy-shortcuts.zip"

mkdir -p "$OUT_DIR"
rm -f "$OUT_FILE"

zip -r "$OUT_FILE" \
  manifest.json \
  popup.html \
  popup.css \
  popup.js \
  icons/icon-16.png \
  icons/icon-32.png \
  icons/icon-48.png \
  icons/icon-128.png \
  >/dev/null

echo "Built $OUT_FILE"
unzip -l "$OUT_FILE"
