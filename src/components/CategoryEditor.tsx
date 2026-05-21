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
import { EMOJI_GROUPS, searchEmoji } from "@/lib/emoji";
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

// The icon field only accepts a single emoji. Split the input into grapheme
// clusters (so multi-codepoint emoji like flags stay intact), drop anything
// that is not pictographic, and keep the last emoji entered.
function sanitizeEmoji(input: string): string {
  const graphemes = Array.from(
    new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(input),
    (s) => s.segment,
  );
  const emoji = graphemes.filter((g) => /\p{Extended_Pictographic}/u.test(g));
  return emoji.length > 0 ? emoji[emoji.length - 1] : "";
}


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
  const [emojiQuery, setEmojiQuery] = useState("");

  useEffect(() => {
    if (open) {
      setForm(
        existing
          ? {
              name: existing.name,
              // Drop any non-emoji legacy value so the picker shows clean.
              icon: sanitizeEmoji(existing.icon ?? ""),
            }
          : EMPTY,
      );
      setError(null);
      setPickerOpen(false);
      setEmojiQuery("");
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
        icon: sanitizeEmoji(form.icon) || null,
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
            <Label>Icon (optional)</Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPickerOpen((v) => !v)}
                className="h-10 w-10 flex items-center justify-center rounded-md border text-xl hover:bg-accent transition-colors"
                title="Choose an icon"
              >
                {form.icon || (
                  <span className="text-muted-foreground text-base">＋</span>
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
                  Click to choose an emoji
                </span>
              )}
            </div>

            {pickerOpen ? (
              <div className="mt-1 rounded-md border">
                <div className="p-2 border-b">
                  <Input
                    value={emojiQuery}
                    onChange={(e) => setEmojiQuery(e.currentTarget.value)}
                    placeholder="Search — e.g. rocket, folder, star"
                    autoFocus
                  />
                </div>
                <div className="max-h-52 overflow-y-auto p-2">
                  {(() => {
                    const pick = (char: string) => {
                      update("icon", char);
                      setPickerOpen(false);
                    };
                    const cellClass = (char: string) =>
                      cn(
                        "h-8 w-8 flex items-center justify-center rounded text-lg hover:bg-accent transition-colors",
                        form.icon === char && "bg-accent",
                      );

                    if (emojiQuery.trim()) {
                      const results = searchEmoji(emojiQuery);
                      if (results.length === 0) {
                        return (
                          <div className="text-xs text-muted-foreground text-center py-4">
                            No emoji match “{emojiQuery.trim()}”.
                          </div>
                        );
                      }
                      return (
                        <div className="grid grid-cols-8 gap-1">
                          {results.map((entry) => (
                            <button
                              key={entry.char}
                              type="button"
                              onClick={() => pick(entry.char)}
                              title={entry.keywords}
                              className={cellClass(entry.char)}
                            >
                              {entry.char}
                            </button>
                          ))}
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        {EMOJI_GROUPS.map((group) => (
                          <div key={group.label}>
                            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground px-1 pb-0.5">
                              {group.label}
                            </div>
                            <div className="grid grid-cols-8 gap-1">
                              {group.emoji.map((entry) => (
                                <button
                                  key={entry.char}
                                  type="button"
                                  onClick={() => pick(entry.char)}
                                  title={entry.keywords}
                                  className={cellClass(entry.char)}
                                >
                                  {entry.char}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
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
