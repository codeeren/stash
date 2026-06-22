# Changelog

All notable changes to Stash will be documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows [SemVer](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.3] — 2026-06-22

### Fixed

- AI-assisted generation no longer fails with "env: node: No such file
  or directory". The AI CLI (a Node script) is now run through the
  user's login shell so Node is on PATH — the minimal PATH a GUI app
  inherits from /Applications was the cause.

## [0.2.2] — 2026-06-21

### Changed

- First release delivered through the new in-app updater, end-to-end.
  No functional changes from 0.2.1.

## [0.2.1] — 2026-06-21

### Added

- **In-app updates.** Stash can now update itself: Settings → About →
  Check for updates downloads and installs the latest release from
  GitHub and restarts, no manual re-download. Updates are signed and
  verified. (This is the first updater-capable build, so it must be
  installed manually once; future versions update in place.)

## [0.2.0] — 2026-06-21

The AI milestone.

### Added

- **AI-assisted item creation.** In the item editor, describe what you
  want in plain language and Stash drafts the item — type, title,
  content (with `{{variable}}` placeholders), description, and tags —
  for you to review and save. Stash shells out to an AI CLI you've
  already installed and signed in to (Claude Code, Codex, or Gemini);
  no API key is stored in Stash, and nothing runs without confirmation.
  Configure it under Settings → AI, which auto-detects your installed
  CLIs. Off by default.
- **Per-item passphrase lock.** Hide an item's content behind a
  passphrase. Locked items show a 🔒, reveal an unlock prompt in the
  detail panel, and can't be run or copied (from the panel, the menu
  bar, or Enter) until unlocked. This is a privacy gate, not encryption
  — only the passphrase hash is stored; the content stays plaintext.

### Changed

- A command launched from the menu bar hides the main window again once
  its dialog closes, so Stash returns to the tray.
- A silent command that finishes with no output closes its dialog
  immediately; output and errors still keep it open.

## [0.1.9] — 2026-06-13

### Changed

- Brand-new app icon, drawn from scratch: a fanned deck of cards on an
  indigo squircle with a node-graph "hub" mark — Stash as the single
  hub for your commands, prompts, and snippets. The menu-bar (tray)
  icon is a clean stroked silhouette of the same deck, finally legible
  at small sizes.

## [0.1.8] — 2026-06-01

### Added

- New app icon and matching menu-bar (tray) silhouette — a friendlier
  bowl-of-cards illustration replaces the old chest.
- The DMG now contains an Applications shortcut next to Stash.app, so
  installation is the familiar drag-into-Applications gesture.

### Changed

- License switched from MIT to **PolyForm Noncommercial 1.0.0**. The
  source remains publicly available and noncommercial use, modification,
  and redistribution are still allowed; commercial use is now reserved
  by the author.

## [0.1.7] — 2026-05-28

### Changed

- **Two-tone dark theme.** The sidebar and the content panels now use
  different dark shades (sidebar `#262626`, content `#20201e`) for a
  clearer separation.
- **Edge-to-edge window.** The macOS title bar is transparent so each
  panel's colour extends to the very top — no more seam between the
  title bar and the app's chrome. Traffic lights stay where they are.
- The redundant "Stash" label inside the sidebar is gone — the OS
  already shows the app name in the Dock and menu bar.

### Fixed

- The window can be dragged from the top strip even while Stash is the
  focused app (previously you had to click into another app first).

## [0.1.6] — 2026-05-28

### Fixed

- macOS Sequoia no longer shows the "Support for Intel-based apps is
  ending" warning when opening Stash. The Tauri bundler injects a stale
  `LSRequiresCarbon = true` key into the Info.plist that Sequoia reads
  as an old Intel binary; a post-bundle step strips it, re-signs the
  app, and repacks the DMG.
- Silent commands no longer hang the dialog when the command is a
  long-running service. After a short wait window the run returns
  "Started in background" and the process keeps running on its own.

### Changed

- New `npm run build:release` script (`tauri build` + the post-bundle
  patch). Use it for actual releases; plain `tauri build` still works
  for local testing.

## [0.1.5] — 2026-05-22

### Added

- Per-item **"Run silently in the background"** option for commands. When
  enabled, the command runs without opening Terminal.app and the dialog
  shows the result inline ("Done" or "Didn't work" with any output it
  printed). Best for short, output-less commands like locking the screen
  or flushing DNS. Off by default; the confirmation dialog and danger
  detection still apply.

## [0.1.4] — 2026-05-22

### Added

- Settings is now a tabbed dialog (Shortcuts, Appearance, Backup, About)
  with a left-hand nav, so it stays readable as options grow

### Changed

- Settings apply live for instant preview; Save keeps them and Cancel /
  Esc restores the state from when the dialog was opened
- The macOS build is now properly ad-hoc signed, so downloaded copies
  offer the standard "Open Anyway" path in System Settings instead of
  being rejected outright (the app is still not notarized)
- Thinner, theme-aware scrollbars

## [0.1.3] — 2026-05-22

### Added

- Starter packs on first launch — new users can load curated packs (Git, Docker, FFmpeg, macOS, SSH, AI Prompts, SQL Snippets) or start empty; everything is editable afterwards
- Automatic local JSON backup — a configurable (Off / Daily / Weekly) snapshot written to the app's data folder, with no cloud or setup; manage it under Settings → Backup

### Fixed

- Sort dropdown no longer overflows the bottom bar

## [0.1.2] — 2026-05-22

### Added

- Global quick-launch — a configurable system-wide hotkey (default `⌘⇧Space`) opens a Raycast-style launcher to search and run an item without opening the main window
- Drag items from the list onto a sidebar category to re-assign them
- "Insert variable" button in the item editor, so the `{{ }}` syntax is discoverable

### Changed

- Redesigned sidebar — one consistent visual language, item-count badges, collapsible sections, monochrome line icons
- Category icons use a searchable monochrome icon picker instead of free-text emoji
- `Enter` confirms the Run and Fill dialogs
- Sort order applies uniformly instead of always pinning favorites to the top

## [0.1.1] — 2026-05-22

### Added

- Menu bar tray quick-access — favorite and recent items, plus a "＋ New item" entry
- App version shown at the bottom of the Settings dialog

### Changed

- Variable placeholders accept any non-brace text — Unicode letters (Turkish characters) and spaces included
- The item editor suggests previously-used tags to avoid typo duplicates
- Tags can be deleted from the sidebar

### Fixed

- Clicking the dock icon reopens the window when it was hidden to the tray
- Running a command no longer opens two Terminal windows on a cold launch, and uses a new window when the current tab is busy
- No more window/content flash when activating an item from the menu bar

## [0.1.0] — 2026-04-21

First public release. macOS-only, unsigned build-from-source.

### Added

- Unified items table with four types: command, prompt, snippet, note
- Full-text search across titles, content, and descriptions (SQLite FTS5)
- Categories (with emoji icons) and tags, many-to-many
- Sidebar filters: All items, Favorites, Uncategorized, Category rows, Type chips, Tag chips
- Sort options: Recently used, Most used, Newest, A → Z
- Parameterized items with `{{variable}}` placeholders and a fill-in form
- Variable field types: text, textarea, select, number
- Command execution in Terminal.app with danger detection and pre-flight confirmation
- Execution history logged to the `executions` table
- Markdown rendering for prompt / note content with Rendered / Raw toggle (GFM)
- Command palette (`⌘K`) for instant access
- Menu bar tray icon, toggleable in settings
- Light / Dark / System theme
- Native macOS menu with `⌘F`, `⌘N`, `⌘,` shortcuts
- JSON export and import for backup and sharing
- Sample data seeding for empty databases
- Duplicate item action
- Favorite toggle and favorite-only filter
- Keyboard-first navigation (arrows, Enter, Esc)
- Configurable command palette shortcut
- Use count and last-used tracking per item
