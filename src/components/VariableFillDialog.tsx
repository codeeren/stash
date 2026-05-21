import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExecuteDialog } from "@/components/ExecuteDialog";
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
import { recordItemUse } from "@/lib/items";
import { resolveVariables } from "@/lib/variables";
import { useUiStore } from "@/stores/uiStore";
import type { ItemWithRelations, Variable } from "@/types";

type VariableFillDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ItemWithRelations;
};

function initialValues(vars: Variable[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const v of vars) out[v.name] = v.defaultValue ?? "";
  return out;
}

function VariableField({
  variable,
  value,
  onChange,
}: {
  variable: Variable;
  value: string;
  onChange: (v: string) => void;
}) {
  const label = variable.label ?? variable.name;
  const placeholder = variable.placeholder ?? `{{${variable.name}}}`;

  const control = (() => {
    switch (variable.fieldType) {
      case "textarea":
        return (
          <Textarea
            id={`var-${variable.name}`}
            value={value}
            onChange={(e) => onChange(e.currentTarget.value)}
            placeholder={placeholder}
            className="min-h-[6rem] font-mono text-xs"
          />
        );
      case "number":
        return (
          <Input
            id={`var-${variable.name}`}
            type="number"
            value={value}
            onChange={(e) => onChange(e.currentTarget.value)}
            placeholder={placeholder}
          />
        );
      case "select":
        return (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger id={`var-${variable.name}`}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {(variable.options ?? []).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "text":
      case "file":
      default:
        return (
          <Input
            id={`var-${variable.name}`}
            value={value}
            onChange={(e) => onChange(e.currentTarget.value)}
            placeholder={placeholder}
          />
        );
    }
  })();

  return (
    <div className="space-y-1.5">
      <Label htmlFor={`var-${variable.name}`} className="flex items-baseline gap-2">
        <span>{label}</span>
        <code className="text-xs text-muted-foreground">
          {`{{${variable.name}}}`}
        </code>
      </Label>
      {control}
    </div>
  );
}

export function VariableFillDialog({
  open,
  onOpenChange,
  item,
}: VariableFillDialogProps) {
  const bumpItems = useUiStore((s) => s.bumpItems);

  const [values, setValues] = useState<Record<string, string>>(() =>
    initialValues(item.variables),
  );
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executeOpen, setExecuteOpen] = useState(false);

  const isCommand = item.type === "command";

  // Only reset when the dialog opens or when the item identity changes —
  // not when bumpItems() returns a fresh-but-equivalent variables array
  // (would wipe the user's input mid-flow and flash the UI).
  useEffect(() => {
    if (open) {
      setValues(initialValues(item.variables));
      setCopied(false);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item.id]);

  const preview = useMemo(
    () => resolveVariables(item.content, values),
    [item.content, values],
  );

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(preview);
      await recordItemUse(item.id);
      bumpItems();
      setCopied(true);
      setTimeout(() => onOpenChange(false), 500);
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          const inTextarea =
            (e.target as HTMLElement).tagName === "TEXTAREA";
          const mod = e.metaKey || e.ctrlKey;
          // In a textarea Enter adds a newline; Cmd/Ctrl+Enter still submits.
          if (inTextarea && !mod) return;
          e.preventDefault();
          if (isCommand) setExecuteOpen(true);
          else void onCopy();
        }}
      >
        <DialogHeader>
          <DialogTitle>Fill variables</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {item.variables.map((v) => (
            <VariableField
              key={v.id}
              variable={v}
              value={values[v.name] ?? ""}
              onChange={(val) => setValues((s) => ({ ...s, [v.name]: val }))}
            />
          ))}

          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
              Preview
            </div>
            <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-words font-mono">
              {preview}
            </pre>
          </div>

          {error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="outline" onClick={onCopy}>
            {copied ? "Copied ✓" : "Copy"}
          </Button>
          {isCommand ? (
            <Button onClick={() => setExecuteOpen(true)}>Fill & Run</Button>
          ) : null}
        </DialogFooter>
      </DialogContent>

      {isCommand ? (
        <ExecuteDialog
          open={executeOpen}
          onOpenChange={(o) => {
            setExecuteOpen(o);
            if (!o) onOpenChange(false);
          }}
          itemId={item.id}
          resolvedCommand={preview}
        />
      ) : null}
    </Dialog>
  );
}
