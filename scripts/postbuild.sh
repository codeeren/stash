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

# Rebuild the DMG from the patched .app — and add an Applications symlink
# next to it so users can drag-and-drop inside the DMG window, matching
# the standard macOS install convention.
DMG=$(ls "$DMG_DIR"/Stash_*_aarch64.dmg 2>/dev/null | head -1 || true)
if [ -n "$DMG" ]; then
  STAGING=$(mktemp -d)
  cp -R "$APP" "$STAGING/Stash.app"
  ln -s /Applications "$STAGING/Applications"

  rm "$DMG"
  hdiutil create \
    -volname "Stash" \
    -srcfolder "$STAGING" \
    -ov \
    -format UDZO \
    "$DMG" >/dev/null
  rm -rf "$STAGING"
  echo "postbuild: repacked $DMG (Carbon stripped + Applications shortcut)"
fi

# --- Auto-updater artifacts ------------------------------------------------
# The .app.tar.gz that `tauri build` produced was made BEFORE we stripped
# the Carbon flag and re-signed, so it's stale. Re-tar the patched app and
# re-sign the tarball with the updater key, then write the latest.json
# manifest the in-app updater reads from the GitHub release.
KEY="$HOME/.tauri/stash-updater.key"
MACOS_DIR="src-tauri/target/release/bundle/macos"
VERSION=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" \
  "$APP/Contents/Info.plist")

if [ -f "$KEY" ]; then
  TARBALL="$MACOS_DIR/Stash.app.tar.gz"
  # COPYFILE_DISABLE stops BSD tar from emitting AppleDouble `._*` metadata
  # entries (the .app carries xattrs from code-signing); those entries make
  # the updater's unpack fail with "failed to unpack `._Stash.app`".
  ( cd "$MACOS_DIR" && rm -f Stash.app.tar.gz Stash.app.tar.gz.sig \
      && COPYFILE_DISABLE=1 tar -czf Stash.app.tar.gz Stash.app )
  TAURI_SIGNING_PRIVATE_KEY_PASSWORD="" \
    npx tauri signer sign -f "$KEY" -p "" "$TARBALL" >/dev/null
  SIG=$(cat "$TARBALL.sig")

  cat > "$MACOS_DIR/latest.json" <<JSON
{
  "version": "$VERSION",
  "pub_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "platforms": {
    "darwin-aarch64": {
      "signature": "$SIG",
      "url": "https://github.com/codeeren/stash/releases/download/v$VERSION/Stash.app.tar.gz"
    }
  }
}
JSON
  echo "postbuild: wrote updater artifacts (Stash.app.tar.gz + latest.json) for v$VERSION"
else
  echo "postbuild: updater key not found at $KEY — skipping updater artifacts"
fi
