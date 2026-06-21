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
import { type DetectedCli, detectClis } from "@/lib/ai";
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
import {
  type UpdateState,
  checkForUpdate,
  installUpdate,
} from "@/lib/updater";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUiStore } from "@/stores/uiStore";

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Draft = Record<SettingKey, string>;

type SettingsTab = "shortcuts" | "appearance" | "ai" | "backup" | "about";

const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: "shortcuts", label: "Shortcuts" },
  { id: "appearance", label: "Appearance" },
  { id: "ai", label: "AI" },
  { id: "backup", label: "Backup" },
  { id: "about", label: "About" },
];

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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "export" | "import">(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [tab, setTab] = useState<SettingsTab>("shortcuts");
  const [clis, setClis] = useState<DetectedCli[] | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [updateState, setUpdateState] = useState<UpdateState>({ kind: "idle" });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Holds the pending update object between checking and installing.
  const pendingUpdateRef = useRef<Awaited<
    ReturnType<typeof checkForUpdate>
  > | null>(null);

  const onCheckUpdate = async () => {
    setUpdateState({ kind: "checking" });
    try {
      const u = await checkForUpdate();
      if (u) {
        pendingUpdateRef.current = u;
        setUpdateState({ kind: "available", version: u.version, notes: u.body });
      } else {
        setUpdateState({ kind: "none" });
      }
    } catch (e) {
      setUpdateState({ kind: "error", message: String(e) });
    }
  };

  const onInstallUpdate = async () => {
    const u = pendingUpdateRef.current;
    if (!u) return;
    setUpdateState({ kind: "downloading", percent: 0 });
    try {
      await installUpdate(u, (percent) =>
        setUpdateState({ kind: "downloading", percent }),
      );
      setUpdateState({ kind: "ready" });
    } catch (e) {
      setUpdateState({ kind: "error", message: String(e) });
    }
  };
  // Snapshot of settings when the dialog opened, used to revert on Cancel.
  const originalRef = useRef<Draft>(values);

  useEffect(() => {
    getVersion()
      .then(setAppVersion)
      .catch(() => setAppVersion(null));
  }, []);

  // Snapshot the current settings only when the dialog opens, so Cancel
  // can restore them. `values` is intentionally not a dependency.
  useEffect(() => {
    if (open) {
      setDraft(values);
      originalRef.current = { ...values };
      setError(null);
      setNotice(null);
      setPending(null);
      setTab("shortcuts");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Changes apply live (so the user sees the effect immediately). update()
  // both reflects the change in the UI and persists it.
  const update = (key: SettingKey, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    void setValue(key, value);
    setError(null);
  };

  const reset = (key: SettingKey) => update(key, DEFAULT_SETTINGS[key]);

  // Detect installed AI CLIs the first time the AI tab is shown.
  const runDetect = async () => {
    setDetecting(true);
    try {
      setClis(await detectClis());
    } catch {
      setClis([]);
    } finally {
      setDetecting(false);
    }
  };

  useEffect(() => {
    if (tab === "ai" && clis === null && !detecting) {
      void runDetect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Save just closes — everything is already applied. Cancel restores the
  // settings to the snapshot taken when the dialog opened.
  const close = (save: boolean) => {
    if (!save) {
      const original = originalRef.current;
      for (const key of Object.keys(original) as SettingKey[]) {
        if (values[key] !== original[key]) {
          void setValue(key, original[key]);
        }
      }
    }
    onOpenChange(false);
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
      // The imported settings are now the baseline — Cancel must not undo
      // them.
      originalRef.current = { ...useSettingsStore.getState().values };
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
    <Dialog
      open={open}
      onOpenChange={(o) => {
        // Closing via X / Esc / overlay behaves like Cancel — revert.
        if (!o) close(false);
      }}
    >
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="flex h-[26rem]">
          <nav className="w-40 flex-shrink-0 border-r p-2 space-y-0.5">
            {SETTINGS_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-colors",
                  tab === t.id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {tab === "shortcuts" ? (
              <>
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
                    }}
                  />
                  <div className="space-y-0.5">
                    <div className="text-sm">Global quick-launch</div>
                    <div className="text-xs text-muted-foreground">
                      A system-wide hotkey that opens a search bar to run
                      an item without opening Stash. Turn it off here if
                      you'd rather not have one.
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
                      onChange={(v) => update("shortcut.global.key", v)}
                    />
                  </div>
                ) : null}
              </>
            ) : null}

            {tab === "appearance" ? (
              <>
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <div className="inline-flex rounded-md border p-0.5">
                    {(["light", "dark", "system"] as ThemeValue[]).map(
                      (t) => {
                        const active = draft.theme === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => update("theme", t)}
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
                      },
                    )}
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
                    }}
                  />
                  <div className="space-y-0.5">
                    <div className="text-sm">Show menu bar icon</div>
                    <div className="text-xs text-muted-foreground">
                      Off: closing the window quits Stash. On: closing
                      hides to the menu bar.
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
                            onClick={() => update("tray.sort", opt.v)}
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
              </>
            ) : null}

            {tab === "ai" ? (
              <>
                <div className="space-y-1">
                  <Label>AI assist</Label>
                  <p className="text-xs text-muted-foreground">
                    When set up, the item editor can draft an item from a
                    plain-language request. Stash shells out to an AI CLI
                    you've already installed and signed in to — no API key
                    is stored in Stash. Off until you pick one below.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Provider</Label>
                    <button
                      type="button"
                      onClick={() => void runDetect()}
                      disabled={detecting}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      {detecting ? "Detecting…" : "Re-scan"}
                    </button>
                  </div>

                  <label className="flex items-center gap-2 px-2.5 py-2 rounded-md border cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="ai-provider"
                      checked={draft["ai.provider"] === ""}
                      onChange={() => {
                        update("ai.provider", "");
                        update("ai.binPath", "");
                      }}
                    />
                    <span>Off</span>
                  </label>

                  {(clis ?? []).map((c) => (
                    <label
                      key={c.id}
                      className={cn(
                        "flex items-start gap-2 px-2.5 py-2 rounded-md border text-sm",
                        c.found
                          ? "cursor-pointer"
                          : "opacity-60 cursor-not-allowed",
                      )}
                    >
                      <input
                        type="radio"
                        name="ai-provider"
                        className="mt-0.5"
                        disabled={!c.found}
                        checked={draft["ai.provider"] === c.id}
                        onChange={() => {
                          update("ai.provider", c.id);
                          update("ai.binPath", c.path);
                        }}
                      />
                      <span className="space-y-0.5">
                        <span className="flex items-center gap-2">
                          <span>{c.name}</span>
                          {c.found ? (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400">
                              ✓ found
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              not installed
                            </span>
                          )}
                        </span>
                        <span className="block text-xs text-muted-foreground font-mono break-all">
                          {c.found ? c.path : `Install: ${c.install_hint}`}
                        </span>
                      </span>
                    </label>
                  ))}

                  {clis !== null && clis.every((c) => !c.found) ? (
                    <p className="text-xs text-muted-foreground pt-1">
                      No AI CLI found. Install one of the above (each is a
                      one-time `npm i -g …`), then click Re-scan.
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}

            {tab === "backup" ? (
              <>
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
                  Import replaces all current data. Export first if you
                  want a copy.
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
                          onClick={() => update("backup.auto", opt.v)}
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
              </>
            ) : null}

            {tab === "about" ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Stash</div>
                  <div className="text-xs text-muted-foreground">
                    Version {appVersion ?? "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    A native macOS hub for the commands, prompts, and
                    snippets you keep forgetting. Local-first. Source
                    available under the PolyForm Noncommercial 1.0.0
                    license.
                  </div>
                </div>

                <div className="space-y-2 border-t pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm">Software update</span>
                    {updateState.kind === "available" ? (
                      <Button size="sm" onClick={() => void onInstallUpdate()}>
                        Update to {updateState.version}
                      </Button>
                    ) : updateState.kind === "downloading" ? (
                      <span className="text-xs text-muted-foreground">
                        Downloading… {updateState.percent}%
                      </span>
                    ) : updateState.kind === "ready" ? (
                      <span className="text-xs text-muted-foreground">
                        Restarting…
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void onCheckUpdate()}
                        disabled={updateState.kind === "checking"}
                      >
                        {updateState.kind === "checking"
                          ? "Checking…"
                          : "Check for updates"}
                      </Button>
                    )}
                  </div>
                  {updateState.kind === "none" ? (
                    <div className="text-xs text-muted-foreground">
                      You're on the latest version.
                    </div>
                  ) : updateState.kind === "error" ? (
                    <div className="text-xs text-destructive break-words">
                      {updateState.message}
                    </div>
                  ) : updateState.kind === "available" && updateState.notes ? (
                    <div className="text-xs text-muted-foreground whitespace-pre-wrap break-words max-h-24 overflow-y-auto">
                      {updateState.notes}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="text-sm text-destructive break-words">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter className="px-5 py-3 border-t">
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button onClick={() => close(true)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
