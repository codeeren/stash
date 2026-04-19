import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCategory, updateCategory } from "@/lib/categories";
import { useUiStore } from "@/stores/uiStore";
import type { Category } from "@/types";

type CategoryEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing?: Category | null;
};

type FormState = {
  name: string;
  icon: string;
};

const EMPTY: FormState = { name: "", icon: "" };

export function CategoryEditor({
  open,
  onOpenChange,
  existing,
}: CategoryEditorProps) {
  const bumpCategories = useUiStore((s) => s.bumpCategories);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(
        existing
          ? {
              name: existing.name,
              icon: existing.icon ?? "",
            }
          : EMPTY,
      );
      setError(null);
    }
  }, [open, existing]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onSave = async () => {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        icon: form.icon.trim() || null,
      };
      if (existing) {
        await updateCategory(existing.id, payload);
      } else {
        await createCategory(payload);
      }
      bumpCategories();
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
          <DialogTitle>
            {existing ? "Edit category" : "New category"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              value={form.name}
              onChange={(e) => update("name", e.currentTarget.value)}
              placeholder="e.g. DevOps"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cat-icon">Icon (emoji)</Label>
            <Input
              id="cat-icon"
              value={form.icon}
              onChange={(e) => update("icon", e.currentTarget.value)}
              placeholder="🛠"
              maxLength={4}
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
            {saving
              ? "Saving…"
              : existing
                ? "Save changes"
                : "Create category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
