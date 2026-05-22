import { useEffect, useRef, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ShortcutInput } from "@/components/ShortcutInput";
import {
  type Backup,
  downloadBackupFile,
  exportBackup,
  importBackup,
  readFileAsText,
} from "@/lib/backup";
import {
  type BackupAutoValue,
  DEFAULT_SETTINGS,
  type SettingKey,
  type SortValue,
  type ThemeValue,
} from "@/lib/settings";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUiStore } from "@/stores/uiStore";

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Draft = Record<SettingKey, string>;

type PendingImport = {
  fileName: string;
  backup: Backup;
};

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const values = useSettingsStore((s) => s.values);
  const setValue = useSettingsStore((s) => s.set);
  const loadSettings = useSettingsStore((s) => s.load);
  const bumpItems = useUiStore((s) => s.bumpItems);
  const bumpCategories = useUiStore((s) => s.bumpCategories);
  const bumpTags = useUiStore((s) => s.bumpTags);
  const setSelectedItemId = useUiStore((s) => s.setSelectedItemId);

  const [draft, setDraft] = useState<Draft>(values);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "export" | "import">(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    getVersion()
      .then(setAppVersion)
      .catch(() => setAppVersion(null));
  }, []);

  useEffect(() => {
    if (open) {
      setDraft(values);
      setError(null);
      setNotice(null);
      setPending(null);
    }
  }, [open, values]);

  const update = (key: SettingKey, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setError(null);
  };

  const reset = (key: SettingKey) => update(key, DEFAULT_SETTINGS[key]);

  const onSave = async () => {
    const entries = Object.entries(draft) as [SettingKey, string][];
    const shortcutEntries = entries.filter(([k]) => k.startsWith("shortcut."));
    const seen = new Map<string, SettingKey>();
    for (const [k, v] of shortcutEntries) {
      if (seen.has(v)) {
        setError(`Shortcut ${v} is assigned to more than one action.`);
        return;
      }
      seen.set(v, k);
    }

    setSaving(true);
    try {
      for (const [k, v] of entries) {
        if (values[k] !== v) await setValue(k, v);
      }
      onOpenChange(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const onExport = async () => {
    setBusy("export");
    setError(null);
    setNotice(null);
    try {
      const backup = await exportBackup();
      downloadBackupFile(backup);
      setNotice(
        `Exported ${backup.items.length} items, ${backup.categories.length} categories.`,
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  };

  const onImportClick = () => fileInputRef.current?.click();

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setNotice(null);
    try {
      const text = await readFileAsText(file);
      const parsed = JSON.parse(text) as Backup;
      if (
        typeof parsed?.version !== "number" ||
        !Array.isArray(parsed?.items) ||
        !Array.isArray(parsed?.categories)
      ) {
        throw new Error("This file does not look like a Stash backup.");
      }
      setPending({ fileName: file.name, backup: parsed });
    } catch (err) {
      setError(String(err));
    }
  };

  const onConfirmImport = async () => {
    if (!pending) return;
    setBusy("import");
    setError(null);
    setNotice(null);
    try {
      await importBackup(JSON.stringify(pending.backup));
      await loadSettings();
      setSelectedItemId(null);
      bumpItems();
      bumpCategories();
      bumpTags();
      setNotice(
        `Import complete: ${pending.backup.items.length} items, ${pending.backup.categories.length} categories.`,
      );
      setPending(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-3">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Keyboard shortcuts
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Command palette</Label>
                <button
                  type="button"
                  onClick={() => reset("shortcut.commandPalette")}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset
                </button>
              </div>
              <ShortcutInput
                value={draft["shortcut.commandPalette"]}
                onChange={(v) => update("shortcut.commandPalette", v)}
              />
            </div>
            <label className="flex items-start gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={draft["shortcut.global.enabled"] === "true"}
                onChange={(e) => {
                  const v = e.currentTarget.checked ? "true" : "false";
                  update("shortcut.global.enabled", v);
                  void setValue("shortcut.global.enabled", v);
                }}
              />
              <div className="space-y-0.5">
                <div className="text-sm">Global quick-launch</div>
                <div className="text-xs text-muted-foreground">
                  A system-wide hotkey that opens a search bar to run an
                  item without opening Stash. Turn it off here if you'd
                  rather not have one.
                </div>
              </div>
            </label>
            {draft["shortcut.global.enabled"] === "true" ? (
              <div className="space-y-2 pl-6">
                <div className="flex items-center justify-between">
                  <Label>Quick-launch shortcut</Label>
                  <button
                    type="button"
                    onClick={() => reset("shortcut.global.key")}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Reset
                  </button>
                </div>
                <ShortcutInput
                  value={draft["shortcut.global.key"]}
                  onChange={(v) => {
                    update("shortcut.global.key", v);
                    void setValue("shortcut.global.key", v);
                  }}
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Appearance
            </div>
            <div className="space-y-2">
              <Label>Theme</Label>
              <div className="inline-flex rounded-md border p-0.5">
                {(["light", "dark", "system"] as ThemeValue[]).map((t) => {
                  const active = draft.theme === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        update("theme", t);
                        void setValue("theme", t);
                      }}
                      className={cn(
                        "px-3 py-1 text-xs rounded capitalize transition-colors",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="flex items-start gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={draft["tray.enabled"] !== "false"}
                onChange={(e) => {
                  const v = e.currentTarget.checked ? "true" : "false";
                  update("tray.enabled", v);
                  void setValue("tray.enabled", v);
                }}
              />
              <div className="space-y-0.5">
                <div className="text-sm">Show menu bar icon</div>
                <div className="text-xs text-muted-foreground">
                  Off: closing the window quits Stash. On: closing hides
                  to the menu bar.
                </div>
              </div>
            </label>
            {draft["tray.enabled"] !== "false" ? (
              <div className="space-y-2 pl-6">
                <Label>Menu bar item order</Label>
                <div className="inline-flex rounded-md border p-0.5 flex-wrap">
                  {(
                    [
                      { v: "newest", label: "Newest" },
                      { v: "recent", label: "Recently used" },
                      { v: "mostUsed", label: "Most used" },
                      { v: "alpha", label: "A → Z" },
                    ] as { v: SortValue; label: string }[]
                  ).map((opt) => {
                    const active = draft["tray.sort"] === opt.v;
                    return (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => {
                          update("tray.sort", opt.v);
                          void setValue("tray.sort", opt.v);
                        }}
                        className={cn(
                          "px-3 py-1 text-xs rounded transition-colors",
                          active
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Backup
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onExport}
                disabled={busy !== null}
              >
                {busy === "export" ? "Exporting…" : "Export JSON"}
              </Button>
              <Button
                variant="outline"
                onClick={onImportClick}
                disabled={busy !== null}
              >
                Import JSON…
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={onFileSelected}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Import replaces all current data. Export first if you want a
              copy.
            </div>

            <div className="space-y-2 pt-1">
              <Label>Automatic backup</Label>
              <div className="inline-flex rounded-md border p-0.5">
                {(
                  [
                    { v: "off", label: "Off" },
                    { v: "daily", label: "Daily" },
                    { v: "weekly", label: "Weekly" },
                  ] as { v: BackupAutoValue; label: string }[]
                ).map((opt) => {
                  const active = draft["backup.auto"] === opt.v;
                  return (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => {
                        update("backup.auto", opt.v);
                        void setValue("backup.auto", opt.v);
                      }}
                      className={cn(
                        "px-3 py-1 text-xs rounded transition-colors",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {values["backup.lastAutoAt"]
                    ? `Last backup: ${new Date(
                        values["backup.lastAutoAt"],
                      ).toLocaleString()}`
                    : "No automatic backup yet"}
                </span>
                <button
                  type="button"
                  onClick={() => void invoke("reveal_backups_folder")}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Show in Finder
                </button>
              </div>
            </div>

            {pending ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                <div className="text-sm">
                  Replace all current data with contents of
                  <code className="mx-1">{pending.fileName}</code>?
                </div>
                <div className="text-xs text-muted-foreground">
                  Found {pending.backup.items.length} items,{" "}
                  {pending.backup.categories.length} categories,{" "}
                  {pending.backup.tags.length} tags.
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={onConfirmImport}
                    disabled={busy !== null}
                  >
                    {busy === "import" ? "Importing…" : "Yes, replace"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPending(null)}
                    disabled={busy !== null}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}

            {notice ? (
              <div className="text-xs text-foreground">{notice}</div>
            ) : null}
          </div>

          {error ? (
            <div className="text-sm text-destructive break-words">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
            <span>Stash</span>
            <span>Version {appVersion ?? "—"}</span>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
