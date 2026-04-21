# Changelog

All notable changes to Stash will be documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows [SemVer](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
