import { useEffect, useState } from "react";
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
import { DEFAULT_SETTINGS, type SettingKey } from "@/lib/settings";
import { useSettingsStore } from "@/stores/settingsStore";

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Draft = Record<SettingKey, string>;

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const values = useSettingsStore((s) => s.values);
  const setValue = useSettingsStore((s) => s.set);

  const [draft, setDraft] = useState<Draft>(values);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(values);
      setError(null);
    }
  }, [open, values]);

  const update = (key: SettingKey, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setError(null);
  };

  const reset = (key: SettingKey) => update(key, DEFAULT_SETTINGS[key]);

  const onSave = async () => {
    const entries = Object.entries(draft) as [SettingKey, string][];
    const seen = new Map<string, SettingKey>();
    for (const [k, v] of entries) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
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

          {error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : null}
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
