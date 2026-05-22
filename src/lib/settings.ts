import { getDb } from "@/lib/db";

export type SettingKey =
  | "shortcut.commandPalette"
  | "shortcut.global.enabled"
  | "shortcut.global.key"
  | "theme"
  | "tray.enabled"
  | "tray.sort"
  | "items.sort"
  | "backup.auto"
  | "backup.lastAutoAt";

export type ThemeValue = "light" | "dark" | "system";

export type SortValue = "recent" | "mostUsed" | "newest" | "alpha";

export type BackupAutoValue = "off" | "daily" | "weekly";

export const DEFAULT_SETTINGS: Record<SettingKey, string> = {
  "shortcut.commandPalette": "Mod+K",
  // On by default: the standard macOS hotkey API needs no Accessibility
  // permission, so there is nothing to opt into for safety. Users can
  // still turn it off in Settings.
  "shortcut.global.enabled": "true",
  "shortcut.global.key": "Mod+Shift+Space",
  theme: "system",
  "tray.enabled": "true",
  "tray.sort": "newest",
  "items.sort": "recent",
  // Automatic local JSON backup: a single file, overwritten on schedule.
  "backup.auto": "weekly",
  "backup.lastAutoAt": "",
};

type SettingRow = { key: string; value: string };

export async function getSetting(key: SettingKey): Promise<string> {
  const db = await getDb();
  const rows = await db.select<SettingRow[]>(
    "SELECT key, value FROM settings WHERE key = $1",
    [key],
  );
  return rows[0]?.value ?? DEFAULT_SETTINGS[key];
}

export async function getAllSettings(): Promise<Record<SettingKey, string>> {
  const db = await getDb();
  const rows = await db.select<SettingRow[]>("SELECT key, value FROM settings");
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    if (r.key in DEFAULT_SETTINGS) {
      out[r.key as SettingKey] = r.value;
    }
  }
  return out;
}

export async function setSetting(
  key: SettingKey,
  value: string,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updated_at = CURRENT_TIMESTAMP`,
    [key, value],
  );
}
