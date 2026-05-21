import { useEffect, useState } from "react";
import { PlusIcon } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
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
import {
  CATEGORY_ICON_GROUPS,
  searchCategoryIcons,
} from "@/lib/categoryIcons";
import { cn } from "@/lib/utils";
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [iconQuery, setIconQuery] = useState("");

  useEffect(() => {
    if (open) {
      setForm(
        existing
          ? { name: existing.name, icon: existing.icon ?? "" }
          : EMPTY,
      );
      setError(null);
      setPickerOpen(false);
      setIconQuery("");
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
        icon: form.icon || null,
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

  const pickIcon = (key: string) => {
    update("icon", key);
    setPickerOpen(false);
  };
  const cellClass = (key: string) =>
    cn(
      "h-8 w-8 flex items-center justify-center rounded hover:bg-accent transition-colors",
      form.icon === key && "bg-accent text-accent-foreground",
    );

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
            <Label>Icon (optional)</Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPickerOpen((v) => !v)}
                className="h-10 w-10 flex items-center justify-center rounded-md border hover:bg-accent transition-colors"
                title="Choose an icon"
              >
                {form.icon ? (
                  <CategoryIcon icon={form.icon} className="h-5 w-5" />
                ) : (
                  <PlusIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {form.icon ? (
                <button
                  type="button"
                  onClick={() => update("icon", "")}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Remove
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Click to choose an icon
                </span>
              )}
            </div>

            {pickerOpen ? (
              <div className="mt-1 rounded-md border">
                <div className="p-2 border-b">
                  <Input
                    value={iconQuery}
                    onChange={(e) => setIconQuery(e.currentTarget.value)}
                    placeholder="Search — e.g. rocket, folder, star"
                    autoFocus
                  />
                </div>
                <div className="max-h-52 overflow-y-auto p-2">
                  {iconQuery.trim() ? (
                    (() => {
                      const results = searchCategoryIcons(iconQuery);
                      if (results.length === 0) {
                        return (
                          <div className="text-xs text-muted-foreground text-center py-4">
                            No icons match “{iconQuery.trim()}”.
                          </div>
                        );
                      }
                      return (
                        <div className="grid grid-cols-8 gap-1">
                          {results.map((def) => (
                            <button
                              key={def.key}
                              type="button"
                              onClick={() => pickIcon(def.key)}
                              title={def.key}
                              className={cellClass(def.key)}
                            >
                              <def.Icon className="h-4 w-4" />
                            </button>
                          ))}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="space-y-2">
                      {CATEGORY_ICON_GROUPS.map((group) => (
                        <div key={group.label}>
                          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground px-1 pb-0.5">
                            {group.label}
                          </div>
                          <div className="grid grid-cols-8 gap-1">
                            {group.icons.map((def) => (
                              <button
                                key={def.key}
                                type="button"
                                onClick={() => pickIcon(def.key)}
                                title={def.key}
                                className={cellClass(def.key)}
                              >
                                <def.Icon className="h-4 w-4" />
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
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
