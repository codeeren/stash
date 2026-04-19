import { useEffect, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories } from "@/hooks/useCategories";
import { createItem, updateItem } from "@/lib/items";
import { setItemTags } from "@/lib/tags";
import {
  extractVariableNames,
  syncVariablesFromContent,
} from "@/lib/variables";
import { useUiStore } from "@/stores/uiStore";
import type { Item, ItemType, ItemWithRelations } from "@/types";

const NO_CATEGORY = "__none__";

type ItemEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing?: ItemWithRelations | null;
};

type FormState = {
  type: ItemType;
  title: string;
  content: string;
  language: string;
  description: string;
  categoryId: string;
  isFavorite: boolean;
  tagsInput: string;
};

const EMPTY: FormState = {
  type: "command",
  title: "",
  content: "",
  language: "",
  description: "",
  categoryId: NO_CATEGORY,
  isFavorite: false,
  tagsInput: "",
};

function toFormState(item: ItemWithRelations): FormState {
  return {
    type: item.type,
    title: item.title,
    content: item.content,
    language: item.language ?? "",
    description: item.description ?? "",
    categoryId:
      item.categoryId !== null ? String(item.categoryId) : NO_CATEGORY,
    isFavorite: item.isFavorite,
    tagsInput: item.tags.map((t) => t.name).join(", "),
  };
}

export function ItemEditor({
  open,
  onOpenChange,
  existing,
}: ItemEditorProps) {
  const { categories } = useCategories();
  const bumpItems = useUiStore((s) => s.bumpItems);
  const bumpTags = useUiStore((s) => s.bumpTags);
  const setSelectedItemId = useUiStore((s) => s.setSelectedItemId);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(existing ? toFormState(existing) : EMPTY);
      setError(null);
    }
  }, [open, existing]);

  const detectedVariables = useMemo(
    () => extractVariableNames(form.content),
    [form.content],
  );

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onSave = async () => {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!form.content.trim()) {
      setError("Content is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const categoryId =
        form.categoryId === NO_CATEGORY ? null : Number(form.categoryId);
      const payload = {
        type: form.type,
        title: form.title.trim(),
        content: form.content,
        language: form.language.trim() || null,
        description: form.description.trim() || null,
        categoryId,
        isFavorite: form.isFavorite,
      };

      let saved: Item;
      if (existing) {
        saved = await updateItem(existing.id, payload);
      } else {
        saved = await createItem(payload);
      }

      const tags = form.tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await setItemTags(saved.id, tags);
      await syncVariablesFromContent(saved.id, form.content);

      bumpItems();
      bumpTags();
      setSelectedItemId(saved.id);
      onOpenChange(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit item" : "New item"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-[1fr_10rem] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => update("title", e.currentTarget.value)}
                placeholder="e.g. rsync: mirror directory"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => update("type", v as ItemType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="command">Command</SelectItem>
                  <SelectItem value="prompt">Prompt</SelectItem>
                  <SelectItem value="snippet">Snippet</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => update("categoryId", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}>(Uncategorized)</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.icon ? `${c.icon} ` : ""}
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="language">Language (optional)</Label>
              <Input
                id="language"
                value={form.language}
                onChange={(e) => update("language", e.currentTarget.value)}
                placeholder="bash, python, sql, markdown…"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={form.description}
              onChange={(e) => update("description", e.currentTarget.value)}
              placeholder="One-liner explaining what this does"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={form.content}
              onChange={(e) => update("content", e.currentTarget.value)}
              placeholder="The command, prompt, or snippet. Use {{name}} for variables."
              className="font-mono text-xs min-h-[10rem]"
            />
            {detectedVariables.length > 0 ? (
              <div className="text-xs text-muted-foreground">
                Detected variables:{" "}
                {detectedVariables.map((n, i) => (
                  <span key={n}>
                    <code className="text-foreground">{`{{${n}}}`}</code>
                    {i < detectedVariables.length - 1 ? ", " : ""}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={form.tagsInput}
              onChange={(e) => update("tagsInput", e.currentTarget.value)}
              placeholder="backup, sync, ffmpeg"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isFavorite}
              onChange={(e) => update("isFavorite", e.currentTarget.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Favorite
          </label>

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
            {saving ? "Saving…" : existing ? "Save changes" : "Create item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
