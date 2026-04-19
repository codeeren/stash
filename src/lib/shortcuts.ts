// Canonical shortcut string: "Mod+Shift+K", "Mod+Alt+P", "F5".
// Mod = Cmd on macOS, Ctrl elsewhere. We emit "Mod" so the same string
// can be fed to tauri-plugin-global-shortcut (which accepts "CommandOrControl").

export type Shortcut = {
  mod: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  key: string;
};

const IGNORED_KEYS = new Set([
  "Shift",
  "Control",
  "Meta",
  "Alt",
  "CapsLock",
  "OS",
  "Fn",
]);

function normalizeKey(raw: string): string {
  if (raw.length === 1) return raw.toUpperCase();
  switch (raw) {
    case " ":
      return "Space";
    case "ArrowUp":
      return "Up";
    case "ArrowDown":
      return "Down";
    case "ArrowLeft":
      return "Left";
    case "ArrowRight":
      return "Right";
    case "Escape":
      return "Esc";
    default:
      return raw;
  }
}

export function fromEvent(e: KeyboardEvent): Shortcut | null {
  if (IGNORED_KEYS.has(e.key)) return null;
  return {
    mod: e.metaKey,
    ctrl: e.ctrlKey,
    alt: e.altKey,
    shift: e.shiftKey,
    key: normalizeKey(e.key),
  };
}

export function stringify(s: Shortcut): string {
  const parts: string[] = [];
  if (s.mod) parts.push("Mod");
  if (s.ctrl) parts.push("Ctrl");
  if (s.alt) parts.push("Alt");
  if (s.shift) parts.push("Shift");
  parts.push(s.key);
  return parts.join("+");
}

export function parse(str: string): Shortcut | null {
  if (!str) return null;
  const parts = str.split("+").map((p) => p.trim());
  if (parts.length === 0) return null;
  const key = parts[parts.length - 1];
  const mods = new Set(parts.slice(0, -1));
  if (!key) return null;
  return {
    mod: mods.has("Mod") || mods.has("Cmd") || mods.has("CommandOrControl"),
    ctrl: mods.has("Ctrl") || mods.has("Control"),
    alt: mods.has("Alt") || mods.has("Option"),
    shift: mods.has("Shift"),
    key,
  };
}

export function matches(e: KeyboardEvent, shortcut: string): boolean {
  const parsed = parse(shortcut);
  if (!parsed) return false;
  const from = fromEvent(e);
  if (!from) return false;
  return (
    from.mod === parsed.mod &&
    from.ctrl === parsed.ctrl &&
    from.alt === parsed.alt &&
    from.shift === parsed.shift &&
    from.key.toUpperCase() === parsed.key.toUpperCase()
  );
}

export function hasModifier(s: Shortcut): boolean {
  return s.mod || s.ctrl || s.alt;
}

export function format(str: string): string {
  const s = parse(str);
  if (!s) return "";
  const parts: string[] = [];
  if (s.ctrl) parts.push("⌃");
  if (s.alt) parts.push("⌥");
  if (s.shift) parts.push("⇧");
  if (s.mod) parts.push("⌘");
  parts.push(s.key);
  return parts.join("");
}
