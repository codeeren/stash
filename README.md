# Stash

> Native macOS hub for commands, prompts, and snippets you keep forgetting.

Stash stores, organizes, and runs the terminal commands, AI prompts, and code snippets you use repeatedly but can't keep in your head. Local-first, keyboard-driven, SQLite-backed.

![Stash main view](docs/screenshots/main.png)

## Why Stash

- **Remembers for you** — FFmpeg flags, rsync incantations, curl one-liners, SSH tunnels, LlamaParse/Dockling scripts, all one search away.
- **Prompt library** — keep your Claude / ChatGPT prompts with `{{variables}}`, fill them in a form, copy ready-to-paste output.
- **Snippet grab-bag** — HTML boilerplate, SQL queries, regex patterns, config blobs — tagged and searchable.
- **Runs commands too** — commands open in Terminal.app with a confirmation dialog and danger detection (`rm -rf`, `sudo`, `curl | sh`, and friends).

## Screenshots

<p align="center">
  <img src="docs/screenshots/editor.png" alt="New item editor" width="49%" />
  <img src="docs/screenshots/execute.png" alt="Run command dialog" width="49%" />
</p>

## Features

- Full-text search (SQLite FTS5) across titles, content, descriptions
- Categories, tags, and type filters in the sidebar
- Parameterized items with `{{variable}}` placeholders and a fill-in form
- Command execution in Terminal.app with danger detection
- Markdown rendering for prompts and notes (GFM: tables, task lists, code blocks)
- Command palette (`⌘K`) reaches everything
- Menu bar tray icon, optional
- Light / Dark / System theme
- JSON export and import for backup and sharing
- Keyboard-first: arrows to navigate, `⌘F` to search, `⌘N` for new item, `Enter` to run the primary action
- Sort items by Recently used / Most used / Newest / A → Z

## Install

v0.1 is macOS-only and ships unsigned. Build from source for now.

### Prerequisites

- macOS 12+
- Node.js 18+
- Rust (install via [rustup](https://rustup.rs))

### Build

```bash
git clone https://github.com/erenyilmaz/stash.git
cd stash
npm install
npm run tauri build
```

The bundle lands in `src-tauri/target/release/bundle/macos/Stash.app`. Drag it into `/Applications`.

### Run in development

```bash
npm install
npm run tauri dev
```

## Usage

- **`⌘K`** — command palette
- **`⌘F`** — focus search
- **`⌘N`** — new item
- **`⌘,`** — open settings
- **Arrow keys** — move through the item list
- **Enter** — run the selected item's primary action (Fill & Copy / Run / Copy)
- **Esc** — clear search

Commands are the only type that *executes*. Prompts, snippets, and notes are copied to your clipboard. Use categories and tags to group items; use types to pick behavior.

Your data lives at `~/Library/Application Support/Stash/stash.db`.

## Safety

Command execution always shows a confirmation dialog with the resolved command. Dangerous patterns (`rm -rf`, `sudo`, `curl … | sh`, `dd`, `mkfs`, `> /dev/...`) trigger a red warning before you can run. Every execution is logged.

See [CLAUDE.md §5](CLAUDE.md) for the full security rules.

## Tech stack

- [Tauri 2](https://tauri.app) (Rust) — smaller bundle and lower memory than Electron
- [React 18](https://react.dev) + TypeScript + Vite
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [Zustand](https://zustand-demo.pmnd.rs) for state
- SQLite (via `tauri-plugin-sql`) with FTS5 for search

## Roadmap

- **v0.2** — AI integration (direct Claude / OpenAI calls for prompt items)
- **v0.3** — iCloud / Syncthing sync
- **v0.4** — Plugin system, imports from Raycast / Alfred, CLI companion

Full roadmap in [CLAUDE.md §11](CLAUDE.md).

## Contributing

Pull requests welcome. Keep changes small, follow Conventional Commits. See [CLAUDE.md §8-9](CLAUDE.md) for code conventions.

## License

MIT — see [LICENSE](LICENSE).
