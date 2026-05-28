#!/usr/bin/env bash
# Patches the bundled .app to drop a stale `LSRequiresCarbon = true` key
# that the Tauri 2 bundler still injects. On macOS Sequoia that key makes
# a pure arm64 build look like a legacy Intel app, triggering the Rosetta
# deprecation warning. Re-signs the bundle and rebuilds the DMG so the
# downloaded copy is clean.
set -euo pipefail

APP="src-tauri/target/release/bundle/macos/Stash.app"
DMG_DIR="src-tauri/target/release/bundle/dmg"

if [ ! -d "$APP" ]; then
  echo "postbuild: no .app at $APP — skipping"
  exit 0
fi

# Drop the legacy Carbon requirement. Ignore failure if it's already gone.
/usr/libexec/PlistBuddy -c "Delete :LSRequiresCarbon" \
  "$APP/Contents/Info.plist" 2>/dev/null || true

# Re-sign (ad-hoc) — modifying the bundle invalidates the prior signature.
codesign --force --deep --sign - "$APP" >/dev/null

# Rebuild the DMG from the patched .app.
DMG=$(ls "$DMG_DIR"/Stash_*_aarch64.dmg 2>/dev/null | head -1 || true)
if [ -n "$DMG" ]; then
  rm "$DMG"
  hdiutil create \
    -volname "Stash" \
    -srcfolder "$APP" \
    -ov \
    -format UDZO \
    "$DMG" >/dev/null
  echo "postbuild: repacked $DMG (Carbon flag stripped)"
fi
