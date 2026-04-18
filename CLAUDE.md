# Stash

> Native macOS hub for commands, prompts, and snippets you keep forgetting.

Stash is a native Mac app that stores, organizes, and executes the terminal commands, AI prompts, and code snippets you use repeatedly but can't keep in your head. Open source, Tauri-based, SQLite-backed, keyboard-first.

---

## 1. Product Vision

**One-liner:** A single hub for every command, prompt, and snippet you wish you could remember — with one-tap copy, parameterized execution, and Spotlight-like instant access.

**Who it's for:**
- Developers who run the same CLI commands across projects but forget syntax (FFmpeg, rsync, docker, ssh tunnels, LlamaParse, etc.)
- Power users who maintain prompt libraries for AI tools (Claude, ChatGPT, etc.)
- Technical professionals with cross-project snippet collections (HTML templates, SQL queries, regex patterns)

**What it is NOT:**
- Not a full IDE or code editor
- Not a note-taking app (Obsidian/Notion exist)
- Not a team collaboration tool (single-user, local-first)
- Not a cloud service (local SQLite, no forced accounts)

**Positioning vs. competitors:**
- vs. **Raycast**: Raycast is an app launcher with extensions. Stash is focused specifically on the command/prompt/snippet library use case with first-class parameterization and execution.
- vs. **Espanso**: Espanso is text expansion. Stash stores, executes, and renders with variables — broader scope.
- vs. **Obsidian/Notion**: Those are note-taking apps. Stash executes what it stores.
- vs. **Warp**: Warp is a terminal. Stash is a library that feeds any terminal (or runs commands itself).

---

## 2. Tech Stack

**Framework:** Tauri 2.x (not v1)
**Frontend:** React 18 + TypeScript + Vite
**Styling:** Tailwind CSS + shadcn/ui components
**State:** Zustand
**Database:** SQLite via `tauri-plugin-sql`, with FTS5 for full-text search
**Global hotkey:** `tauri-plugin-global-shortcut`
**Menu bar / tray:** `tauri-plugin-tray` (Tauri 2 built-in)
**Shell execution:** `tauri-plugin-shell` with strict allowlist and user confirmation

**Why this stack:**
- Tauri over Electron: smaller bundle, better macOS integration, lower memory footprint
- React over Svelte/Vue: largest component ecosystem, shadcn/ui availability
- SQLite over JSON files: scales to thousands of items, FTS5 is production-grade search
- TypeScript: non-negotiable for open source — contributors expect it

---

## 3. Data Model

Single unified `items` table with a `type` discriminator. Keep the schema narrow; resist adding columns.

```sql
-- Core table
CREATE TABLE items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('command', 'prompt', 'snippet', 'note')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT,              -- 'bash', 'python', 'html', 'sql', 'markdown', etc.
  description TEXT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  is_favorite BOOLEAN DEFAULT 0,
  use_count INTEGER DEFAULT 0,
  last_used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT,                  -- emoji or lucide-react icon name
  color TEXT,                 -- hex
  parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE item_tags (
  item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);

-- Parameterized items: {{variable_name}} placeholders in content
CREATE TABLE variables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  label TEXT,                 -- human-friendly label for the form field
  placeholder TEXT,
  default_value TEXT,
  field_type TEXT DEFAULT 'text' CHECK(field_type IN ('text', 'textarea', 'file', 'select', 'number')),
  options TEXT,               -- JSON array for 'select' type
  sort_order INTEGER DEFAULT 0
);

-- Execution history (commands only)
CREATE TABLE executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
  resolved_command TEXT NOT NULL,
  exit_code INTEGER,
  output TEXT,
  executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Full-text search
CREATE VIRTUAL TABLE items_fts USING fts5(
  title, content, description,
  content='items', content_rowid='id'
);

-- FTS triggers to keep index in sync
CREATE TRIGGER items_ai AFTER INSERT ON items BEGIN
  INSERT INTO items_fts(rowid, title, content, description)
  VALUES (new.id, new.title, new.content, new.description);
END;

CREATE TRIGGER items_ad AFTER DELETE ON items BEGIN
  DELETE FROM items_fts WHERE rowid = old.id;
END;

CREATE TRIGGER items_au AFTER UPDATE ON items BEGIN
  DELETE FROM items_fts WHERE rowid = old.id;
  INSERT INTO items_fts(rowid, title, content, description)
  VALUES (new.id, new.title, new.content, new.description);
END;
```

**Database location:** `~/Library/Application Support/Stash/stash.db`

**Variable syntax in content:** `{{variable_name}}` — double braces. Example:
```
llamaparse --output-dir {{output_dir}} {{input_pdf}}
```

---

## 4. v0.1 Scope (MVP)

**MUST have:**
- [ ] Create / read / update / delete items (all four types)
- [ ] Category tree (nested, drag-to-reorder)
- [ ] Tag system (many-to-many)
- [ ] Full-text search via FTS5, <100ms response
- [ ] One-click copy to clipboard
- [ ] Global hotkey (default `⌘⇧Space`, configurable)
- [ ] Menu bar tray icon with quick access
- [ ] Command palette (`⌘K`) inside app
- [ ] Keyboard-first navigation (arrows, enter, escape — no mouse required)
- [ ] Command execution with pre-flight confirmation dialog
- [ ] Variable resolution UI (form appears when item has variables)
- [ ] JSON export and import (for backup and sharing)
- [ ] Light and dark mode (follows system)

**WILL NOT have in v0.1:**
- ❌ AI integration (direct Claude/OpenAI API calls)
- ❌ Cloud sync
- ❌ Multi-workspace
- ❌ Plugin / extension system
- ❌ Sharing / collaboration features
- ❌ Mobile version
- ❌ Windows / Linux builds (macOS only for v0.1 — expand later if traction)

**v0.2+ candidates:** AI API integration, iCloud/Syncthing sync support, import from Raycast/Alfred snippets, shell integration (CLI tool for piping), plugin system.

---

## 5. Security Rules (NON-NEGOTIABLE)

Shell execution is a loaded gun. Treat it accordingly.

1. **Every command execution MUST show a confirmation dialog** with the fully resolved command before running. No "don't ask again" option in v0.1.
2. **Dangerous command detection:** scan resolved commands for patterns (`rm -rf`, `sudo`, `curl ... | sh`, `dd`, `mkfs`, `> /dev/`) and show a red warning in the confirmation dialog.
3. **Execution is sandboxed to user shell**, no elevated privileges, no PATH manipulation.
4. **All executions are logged** in the `executions` table with exit code and truncated output (first 10KB).
5. **Tauri allowlist:** `tauri-plugin-shell` must have a narrow allowlist. Commands run via a single controlled invocation point.
6. **No remote code loading.** Never fetch and execute code from URLs. Variables are resolved locally only.
7. **Clipboard paste from items is safe.** Execution from items requires confirmation.

---

## 6. UX Principles

1. **Keyboard first, mouse optional.** Every action must have a keyboard path. Command palette (`⌘K`) reaches everything.
2. **Under 100ms perceived latency.** Search, navigation, copy must feel instant.
3. **Native Mac feel.** Use macOS vibrancy, standard keyboard shortcuts, system font, proper window controls.
4. **Progressive disclosure.** Main UI is a list. Details on selection. Editing in a dedicated pane, not modal-over-modal.
5. **One place for everything.** No switching between command list, prompt list, snippet list — unified item table with type filter.
6. **Power user escape hatches.** Allow raw SQL query in debug mode, JSON editing of item metadata, arbitrary shell override.
7. **No telemetry by default.** If added later, strictly opt-in with transparent disclosure.

---

## 7. Project Structure

```
stash/
├── CLAUDE.md                 # This file — source of truth
├── README.md                 # User-facing readme
├── LICENSE                   # MIT
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── index.html
├── src/                      # React frontend
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── ui/               # shadcn components (generated)
│   │   ├── ItemList.tsx
│   │   ├── ItemDetail.tsx
│   │   ├── ItemEditor.tsx
│   │   ├── CategoryTree.tsx
│   │   ├── CommandPalette.tsx
│   │   ├── ExecuteDialog.tsx
│   │   └── VariableForm.tsx
│   ├── hooks/
│   │   ├── useItems.ts
│   │   ├── useCategories.ts
│   │   ├── useSearch.ts
│   │   └── useHotkey.ts
│   ├── stores/               # Zustand
│   │   ├── uiStore.ts
│   │   └── selectionStore.ts
│   ├── lib/
│   │   ├── db.ts             # SQLite query helpers
│   │   ├── variables.ts      # {{var}} resolution
│   │   └── danger.ts         # Dangerous command detection
│   └── types/
│       └── index.ts
├── src-tauri/                # Rust backend
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── build.rs
│   ├── icons/
│   └── src/
│       ├── main.rs
│       ├── commands.rs       # #[tauri::command] handlers
│       ├── shell.rs          # Guarded shell execution
│       └── migrations.rs     # SQLite schema migrations
└── docs/
    ├── architecture.md
    ├── contributing.md
    └── screenshots/
```

---

## 8. Code Conventions

**TypeScript:**
- Strict mode on, no `any` without a `// eslint-disable-next-line` comment explaining why
- Prefer `type` over `interface` unless extending
- Named exports only, no default exports (easier refactoring)
- File names: `PascalCase.tsx` for components, `camelCase.ts` for everything else

**React:**
- Functional components with hooks, no classes
- Custom hooks in `src/hooks/`, one hook per file
- Colocate component-specific types and small helpers with the component
- No inline styles; use Tailwind classes
- Component props always typed explicitly

**Rust:**
- `rustfmt` enforced (default config)
- `clippy` clean before commit, `#[allow(...)]` with justification if needed
- All `#[tauri::command]` functions return `Result<T, String>` — errors stringified for frontend

**Naming:**
- Files and folders in English (this is an open source project)
- Code comments in English
- Commit messages in English, Conventional Commits format (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`)

**Testing:**
- v0.1 target: happy-path integration tests for data layer (SQLite CRUD + FTS)
- Component tests deferred to v0.2
- Manual QA checklist in `docs/qa-checklist.md`

---

## 9. Git Workflow

- `main` branch is always releasable
- Feature branches: `feat/<short-name>`, `fix/<short-name>`
- One logical change per PR, even if it's small
- Commit messages follow Conventional Commits
- Tag releases as `v0.1.0`, `v0.1.1`, etc. (semver)
- `CHANGELOG.md` updated on every release

---

## 10. Open Source Considerations

- **License:** MIT (permissive, contributor-friendly)
- **README must answer in first 30 seconds:** what it is, who it's for, how to install, one screenshot
- **Screenshots required** in README — this is a visual product
- **CONTRIBUTING.md** with setup steps, coding style, PR checklist
- **Issue templates** for bug reports and feature requests
- **No CLA** — DCO sign-off sufficient if needed
- **Apple code signing:** v0.1 may ship unsigned with build-from-source instructions. Plan to set up Developer ID signing + notarization by v0.2 once community shows up.
- **Release artifacts:** `.dmg` for installer, `.app.tar.gz` for portable, sha256 checksums

---

## 11. Roadmap

**v0.1 — Foundation (target: 8-10 weeks)**
Phase 1 (weeks 1-3): Project setup, data layer, basic CRUD UI
Phase 2 (weeks 4-5): Native integration (global hotkey, tray, command palette)
Phase 3 (weeks 6-7): Command execution, variable system, danger detection
Phase 4 (weeks 8-10): Polish, icon/branding, README, screenshots, v0.1.0 release

**v0.2 — AI integration**
Direct Claude/OpenAI API calls from prompt items, API key management in keychain.

**v0.3 — Sync**
iCloud Drive and Syncthing support for multi-device.

**v0.4 — Ecosystem**
Plugin system, import from Raycast/Alfred, CLI companion tool.

---

## 12. Decision Log

Record major decisions here with dates. Future contributors (and future-you) will thank present-you.

- **2026-04-18** — Chose Tauri over Electron: smaller bundle, better macOS integration, lower memory footprint.
- **2026-04-18** — Chose unified `items` table over separate tables per type: easier FTS, simpler queries, minimal schema cost.
- **2026-04-18** — Chose `{{var}}` over `${var}` or `{var}` for variable placeholders: less collision with shell syntax.
- **2026-04-18** — macOS-only for v0.1: reduce scope, validate demand before cross-platform investment.

---

## 13. Out-of-Scope Temptations (Resist)

A running list of features that will seem like good ideas during development but are NOT in scope for v0.1. Do not let scope creep kill this project.

- ❌ Web clipper / browser extension
- ❌ Team / sharing features
- ❌ Cloud backend
- ❌ Plugin system
- ❌ Mobile app
- ❌ Built-in terminal
- ❌ Built-in code editor with syntax highlighting beyond Monaco read-only view
- ❌ AI-generated commands from natural language (comes in v0.2)
- ❌ Visual command builder (flow chart UI)
- ❌ Git integration for version-controlling your item library

If a feature request matches anything above, add it to `docs/future-ideas.md` and move on.

---

## 14. Notes for Claude Code

When working on this project:
1. **Read this file at the start of every session.** It's the single source of truth.
2. **Before adding a dependency, justify it** in the commit message or PR description.
3. **Schema changes require a migration file** in `src-tauri/src/migrations.rs`. Never break existing databases.
4. **Ask before adding features not listed in Section 4.** Scope creep is the #1 risk.
5. **Commit in small, reviewable chunks.** Easier for a solo maintainer to review.
6. **Update this file** when a major decision is made — add it to Section 12.
7. **When in doubt about UX, favor the keyboard-first path.**
