import { useEffect, useMemo, useRef, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories } from "@/hooks/useCategories";
import { useTags } from "@/hooks/useTags";
import { generateItem } from "@/lib/ai";
import { detectDanger } from "@/lib/danger";
import { hashPassphrase } from "@/lib/lock";
import { createItem, updateItem } from "@/lib/items";
import { setItemTags } from "@/lib/tags";
import { extractVariableNames, setItemVariables } from "@/lib/variables";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUiStore } from "@/stores/uiStore";
import type {
  Item,
  ItemType,
  ItemWithRelations,
  NewVariable,
  VariableFieldType,
} from "@/types";

const NO_CATEGORY = "__none__";

type ItemEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing?: ItemWithRelations | null;
};

type VarConfig = {
  label: string;
  fieldType: VariableFieldType;
  defaultValue: string;
  placeholder: string;
  options: string;
};

function emptyVarConfig(): VarConfig {
  return {
    label: "",
    fieldType: "text",
    defaultValue: "",
    placeholder: "",
    options: "",
  };
}

type FormState = {
  type: ItemType;
  title: string;
  content: string;
  language: string;
  description: string;
  categoryId: string;
  isFavorite: boolean;
  silent: boolean;
  locked: boolean;
  // New passphrase typed in this session; blank keeps the existing one
  // when editing an already-locked item.
  lockPassphrase: string;
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
  silent: false,
  locked: false,
  lockPassphrase: "",
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
    silent: item.silent,
    locked: item.locked,
    lockPassphrase: "",
    tagsInput: item.tags.map((t) => t.name).join(", "),
  };
}

function toVarConfigs(
  item: ItemWithRelations,
): Record<string, VarConfig> {
  const out: Record<string, VarConfig> = {};
  for (const v of item.variables) {
    out[v.name] = {
      label: v.label ?? "",
      fieldType: v.fieldType,
      defaultValue: v.defaultValue ?? "",
      placeholder: v.placeholder ?? "",
      options: v.options ? v.options.join(", ") : "",
    };
  }
  return out;
}

export function ItemEditor({
  open,
  onOpenChange,
  existing,
}: ItemEditorProps) {
  const { categories } = useCategories();
  const { tags: allTags } = useTags();
  const bumpItems = useUiStore((s) => s.bumpItems);
  const bumpTags = useUiStore((s) => s.bumpTags);
  const setSelectedItemId = useUiStore((s) => s.setSelectedItemId);

  const aiProvider = useSettingsStore((s) => s.values["ai.provider"]);
  const aiBinPath = useSettingsStore((s) => s.values["ai.binPath"]);
  const aiEnabled = Boolean(aiProvider && aiBinPath);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [varConfigs, setVarConfigs] = useState<Record<string, VarConfig>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiRequest, setAiRequest] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(existing ? toFormState(existing) : EMPTY);
      setVarConfigs(existing ? toVarConfigs(existing) : {});
      setError(null);
      setAiRequest("");
      setAiError(null);
      setAiBusy(false);
    }
  }, [open, existing]);

  // Ask the configured CLI to draft an item from a natural-language
  // request, then fill the form with what it returns. The user reviews
  // and edits before saving — nothing runs automatically.
  const runAiGenerate = async () => {
    if (!aiRequest.trim() || aiBusy) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const gen = await generateItem(aiProvider, aiBinPath, aiRequest.trim());
      setForm((f) => ({
        ...f,
        type: gen.type,
        title: gen.title || f.title,
        content: gen.content || f.content,
        description: gen.description || f.description,
        tagsInput: gen.tags.length > 0 ? gen.tags.join(", ") : f.tagsInput,
      }));
    } catch (e) {
      setAiError(String(e instanceof Error ? e.message : e));
    } finally {
      setAiBusy(false);
    }
  };

  const detectedVariables = useMemo(
    () => extractVariableNames(form.content),
    [form.content],
  );

  // Silent commands bypass the pre-flight dialog, so the danger scan runs
  // here instead — while the user can still change their mind.
  const silentWarnings = useMemo(
    () =>
      form.type === "command" && form.silent
        ? detectDanger(form.content)
        : [],
    [form.type, form.silent, form.content],
  );

  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Insert a {{}} placeholder at the cursor. If text is selected, wrap it
  // (e.g. "path" → "{{path}}"); otherwise drop an empty {{}} and put the
  // caret between the braces ready for typing.
  const insertVariable = () => {
    const ta = contentRef.current;
    const text = form.content;
    const start = ta?.selectionStart ?? text.length;
    const end = ta?.selectionEnd ?? text.length;
    const selected = text.slice(start, end);
    const inserted = selected ? `{{${selected}}}` : "{{}}";
    const next = text.slice(0, start) + inserted + text.slice(end);
    const caret = selected ? start + inserted.length : start + 2;
    update("content", next);
    requestAnimationFrame(() => {
      ta?.focus();
      ta?.setSelectionRange(caret, caret);
    });
  };

  useEffect(() => {
    setVarConfigs((prev) => {
      const next: Record<string, VarConfig> = {};
      for (const name of detectedVariables) {
        next[name] = prev[name] ?? emptyVarConfig();
      }
      return next;
    });
  }, [detectedVariables]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const updateVar = (name: string, patch: Partial<VarConfig>) =>
    setVarConfigs((s) => ({ ...s, [name]: { ...s[name], ...patch } }));

  const onSave = async () => {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!form.content.trim()) {
      setError("Content is required.");
      return;
    }

    // Lock: need either a new passphrase or an existing one to keep.
    if (form.locked && !form.lockPassphrase && !existing?.lockHash) {
      setError("Set a passphrase to lock this item.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const categoryId =
        form.categoryId === NO_CATEGORY ? null : Number(form.categoryId);

      // Resolve the lock hash: new passphrase → hash it; locked with no new
      // passphrase → keep the existing hash; unlocked → null.
      let lockHash: string | null = null;
      if (form.locked) {
        lockHash = form.lockPassphrase
          ? await hashPassphrase(form.lockPassphrase)
          : (existing?.lockHash ?? null);
      }

      const payload = {
        type: form.type,
        title: form.title.trim(),
        content: form.content,
        language: form.language.trim() || null,
        description: form.description.trim() || null,
        categoryId,
        isFavorite: form.isFavorite,
        // Only commands run; the silent flag is meaningless for other
        // types, so always store false for them.
        silent: form.type === "command" ? form.silent : false,
        locked: form.locked,
        lockHash,
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

      const vars: Omit<NewVariable, "itemId">[] = detectedVariables.map(
        (name, i) => {
          const cfg = varConfigs[name] ?? emptyVarConfig();
          const options =
            cfg.fieldType === "select"
              ? cfg.options
                  .split(",")
                  .map((o) => o.trim())
                  .filter(Boolean)
              : null;
          return {
            name,
            label: cfg.label.trim() || null,
            placeholder: cfg.placeholder.trim() || null,
            defaultValue: cfg.defaultValue.trim() || null,
            fieldType: cfg.fieldType,
            options: options && options.length > 0 ? options : null,
            sortOrder: i,
          };
        },
      );
      await setItemVariables(saved.id, vars);

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

        {aiEnabled ? (
          <div className="rounded-md border bg-muted/40 p-2.5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">✨</span>
              <input
                value={aiRequest}
                onChange={(e) => setAiRequest(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void runAiGenerate();
                  }
                }}
                disabled={aiBusy}
                placeholder="Describe what you want — e.g. “command to compress a folder to tar.gz”"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
              />
              <Button
                size="sm"
                onClick={() => void runAiGenerate()}
                disabled={aiBusy || !aiRequest.trim()}
              >
                {aiBusy ? "Thinking…" : "Generate"}
              </Button>
            </div>
            {aiError ? (
              <div className="text-xs text-destructive">{aiError}</div>
            ) : (
              <div className="text-xs text-muted-foreground">
                AI drafts the fields below; review and edit before saving.
              </div>
            )}
          </div>
        ) : null}

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
              <div className="flex items-center gap-1.5">
                <Label>Type</Label>
                <span
                  tabIndex={0}
                  aria-label="Type info"
                  className="group relative text-muted-foreground hover:text-foreground focus:text-foreground cursor-help text-xs leading-none select-none outline-none"
                >
                  ⓘ
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 w-64 -translate-x-1/2 rounded-md border bg-popover px-3 py-2 text-xs font-normal normal-case tracking-normal text-popover-foreground shadow-md opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100"
                  >
                    <span className="block">
                      <b>Command</b> — runs in Terminal.
                    </span>
                    <span className="block">
                      <b>Prompt / Snippet / Note</b> — copies to clipboard.
                    </span>
                    <span className="mt-1 block text-muted-foreground">
                      Use Categories and Tags to group items further.
                    </span>
                  </span>
                </span>
              </div>
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
                      <span className="flex items-center gap-1.5">
                        <CategoryIcon icon={c.icon} className="h-3.5 w-3.5" />
                        {c.name}
                      </span>
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
            <div className="flex items-center justify-between">
              <Label htmlFor="content">Content</Label>
              <button
                type="button"
                onClick={insertVariable}
                title="Insert a {{variable}} placeholder at the cursor"
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <span className="font-mono">{"{ }"}</span>
                <span>Insert variable</span>
              </button>
            </div>
            <Textarea
              id="content"
              ref={contentRef}
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

          {detectedVariables.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Variable settings
              </div>
              <div className="space-y-3">
                {detectedVariables.map((name) => {
                  const cfg = varConfigs[name] ?? emptyVarConfig();
                  return (
                    <div
                      key={name}
                      className="rounded-md border p-3 space-y-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-foreground bg-muted rounded px-1.5 py-0.5">
                          {`{{${name}}}`}
                        </code>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <Label
                            htmlFor={`lbl-${name}`}
                            className="text-xs"
                          >
                            Label
                          </Label>
                          <Input
                            id={`lbl-${name}`}
                            value={cfg.label}
                            onChange={(e) =>
                              updateVar(name, {
                                label: e.currentTarget.value,
                              })
                            }
                            placeholder={name}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Type</Label>
                          <Select
                            value={cfg.fieldType}
                            onValueChange={(v) =>
                              updateVar(name, {
                                fieldType: v as VariableFieldType,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="textarea">
                                Textarea
                              </SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="select">Select</SelectItem>
                              <SelectItem value="file">File path</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label
                            htmlFor={`def-${name}`}
                            className="text-xs"
                          >
                            Default
                          </Label>
                          <Input
                            id={`def-${name}`}
                            value={cfg.defaultValue}
                            onChange={(e) =>
                              updateVar(name, {
                                defaultValue: e.currentTarget.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label
                            htmlFor={`ph-${name}`}
                            className="text-xs"
                          >
                            Placeholder
                          </Label>
                          <Input
                            id={`ph-${name}`}
                            value={cfg.placeholder}
                            onChange={(e) =>
                              updateVar(name, {
                                placeholder: e.currentTarget.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      {cfg.fieldType === "select" ? (
                        <div className="space-y-1">
                          <Label
                            htmlFor={`opt-${name}`}
                            className="text-xs"
                          >
                            Options (comma-separated)
                          </Label>
                          <Input
                            id={`opt-${name}`}
                            value={cfg.options}
                            onChange={(e) =>
                              updateVar(name, {
                                options: e.currentTarget.value,
                              })
                            }
                            placeholder="small, medium, large"
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={form.tagsInput}
              onChange={(e) => update("tagsInput", e.currentTarget.value)}
              placeholder="backup, sync, ffmpeg"
            />
            {(() => {
              const selected = new Set(
                form.tagsInput
                  .split(",")
                  .map((t) => t.trim().toLowerCase())
                  .filter(Boolean),
              );
              const suggestions = allTags.filter(
                (t) => !selected.has(t.name.toLowerCase()),
              );
              if (suggestions.length === 0) return null;
              const addTag = (name: string) => {
                const current = form.tagsInput.trim();
                const sep = current.length === 0 || current.endsWith(",")
                  ? ""
                  : ", ";
                update("tagsInput", `${current}${sep}${name}`);
              };
              return (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-xs text-muted-foreground self-center">
                    Existing:
                  </span>
                  {suggestions.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => addTag(t.name)}
                      className="text-xs rounded-full border px-2 py-0.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      #{t.name}
                    </button>
                  ))}
                </div>
              );
            })()}
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

          {form.type === "command" ? (
            <div className="space-y-2">
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.silent}
                  onChange={(e) => update("silent", e.currentTarget.checked)}
                  className="h-4 w-4 mt-0.5 rounded border-input"
                />
                <span className="space-y-0.5">
                  <span className="block">Run silently in the background</span>
                  <span className="block text-xs text-muted-foreground">
                    No Terminal window and no confirmation — one keystroke
                    and it's running. Best for short commands with little or
                    no output (e.g. lock screen, flush DNS).
                  </span>
                </span>
              </label>
              {/* The confirmation dialog is the safety net for every other
                  command; silent items trade it away, so the warning has to
                  land here, at the moment the user opts in. */}
              {form.silent ? (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 space-y-1 ml-6">
                  <div className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    ⚠ This command will run without asking
                  </div>
                  <div className="text-xs text-amber-700/90 dark:text-amber-300/90">
                    No confirmation dialog, no Terminal window — pressing
                    Enter on this item runs it immediately, even from the menu
                    bar. Only use this for commands you wrote yourself and
                    trust. Never turn it on for something you imported or
                    copied from someone else without reading it first.
                  </div>
                  {silentWarnings.length > 0 ? (
                    <div className="text-xs text-destructive pt-1">
                      This command looks risky:{" "}
                      {silentWarnings.map((w) => w.pattern).join(", ")}. It
                      will still run with no warning at all.
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.locked}
                onChange={(e) => update("locked", e.currentTarget.checked)}
                className="h-4 w-4 mt-0.5 rounded border-input"
              />
              <span className="space-y-0.5">
                <span className="block">Lock with a passphrase</span>
                <span className="block text-xs text-muted-foreground">
                  Hides the content behind a passphrase prompt. This keeps
                  it out of casual view — it is not encryption, so don't
                  rely on it for truly sensitive secrets.
                </span>
              </span>
            </label>
            {form.locked ? (
              <Input
                type="password"
                value={form.lockPassphrase}
                onChange={(e) =>
                  update("lockPassphrase", e.currentTarget.value)
                }
                placeholder={
                  existing?.lockHash
                    ? "Enter a new passphrase to change it (blank = keep)"
                    : "Choose a passphrase"
                }
                className="ml-6 w-[calc(100%-1.5rem)]"
              />
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
            {saving ? "Saving…" : existing ? "Save changes" : "Create item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
