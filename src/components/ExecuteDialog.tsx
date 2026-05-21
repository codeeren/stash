import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { detectDanger } from "@/lib/danger";
import { runCommand } from "@/lib/execute";
import { recordItemUse } from "@/lib/items";
import { useUiStore } from "@/stores/uiStore";

type ExecuteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: number;
  resolvedCommand: string;
};

export function ExecuteDialog({
  open,
  onOpenChange,
  itemId,
  resolvedCommand,
}: ExecuteDialogProps) {
  const bumpItems = useUiStore((s) => s.bumpItems);

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const warnings = useMemo(
    () => detectDanger(resolvedCommand),
    [resolvedCommand],
  );

  useEffect(() => {
    if (open) {
      setError(null);
      setRunning(false);
    }
  }, [open]);

  const onRun = async () => {
    setRunning(true);
    setError(null);
    try {
      await runCommand(itemId, resolvedCommand);
      await recordItemUse(itemId);
      bumpItems();
      onOpenChange(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !running) {
            e.preventDefault();
            void onRun();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Run command</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
              Command
            </div>
            <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-words font-mono">
              {resolvedCommand}
            </pre>
          </div>

          <div className="text-xs text-muted-foreground">
            Opens in Terminal.app. You'll see live output there.
          </div>

          {warnings.length > 0 ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 space-y-1">
              <div className="text-sm font-medium text-destructive">
                ⚠ Potentially dangerous
              </div>
              <ul className="text-xs text-destructive/90 space-y-0.5 pl-4 list-disc">
                {warnings.map((w) => (
                  <li key={w.pattern}>
                    <code className="font-mono">{w.pattern}</code> —{" "}
                    {w.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {error ? (
            <div className="text-sm text-destructive break-words">{error}</div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={running}
          >
            Cancel
          </Button>
          <Button
            onClick={onRun}
            disabled={running}
            variant={warnings.length > 0 ? "destructive" : "default"}
          >
            {running ? "Opening…" : "Run in Terminal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
