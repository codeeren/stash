# Changelog

All notable changes to Stash will be documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows [SemVer](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
