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
import { runCommand, runCommandSilent } from "@/lib/execute";
import { recordItemUse } from "@/lib/items";
import { useUiStore } from "@/stores/uiStore";

type ExecuteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: number;
  resolvedCommand: string;
  // Per-item: when true, run without opening Terminal and show the result
  // inline in this dialog instead of closing immediately.
  silent?: boolean;
};

type SilentResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  detached: boolean;
};

export function ExecuteDialog({
  open,
  onOpenChange,
  itemId,
  resolvedCommand,
  silent = false,
}: ExecuteDialogProps) {
  const bumpItems = useUiStore((s) => s.bumpItems);

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SilentResult | null>(null);

  const warnings = useMemo(
    () => detectDanger(resolvedCommand),
    [resolvedCommand],
  );

  useEffect(() => {
    if (open) {
      setError(null);
      setRunning(false);
      setResult(null);
    }
  }, [open]);

  const onRun = async () => {
    setRunning(true);
    setError(null);
    try {
      if (silent) {
        const r = await runCommandSilent(itemId, resolvedCommand);
        await recordItemUse(itemId);
        bumpItems();
        setResult(r);
        // Stay open so the user can see the result.
      } else {
        await runCommand(itemId, resolvedCommand);
        await recordItemUse(itemId);
        bumpItems();
        onOpenChange(false);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  };

  const detached = result !== null && result.detached;
  const succeeded = result !== null && !result.detached && result.exitCode === 0;
  const failed = result !== null && !result.detached && result.exitCode !== 0;
  const combinedOutput = result
    ? [result.stdout, result.stderr].filter(Boolean).join("\n").trim()
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !running && !result) {
            e.preventDefault();
            void onRun();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {silent ? "Run in background" : "Run command"}
          </DialogTitle>
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
            {silent
              ? "Runs in the background — no Terminal window. If the command prints anything, it appears below. Most short commands just confirm with “Done.”"
              : "Opens in Terminal.app. You'll see live output there."}
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

          {result ? (
            <div
              className={
                detached
                  ? "rounded-md border bg-muted/50 p-3 space-y-2"
                  : succeeded
                    ? "rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 space-y-2"
                    : "rounded-md border border-destructive/40 bg-destructive/10 p-3 space-y-2"
              }
            >
              <div
                className={
                  detached
                    ? "text-sm font-medium"
                    : succeeded
                      ? "text-sm font-medium text-emerald-600 dark:text-emerald-400"
                      : "text-sm font-medium text-destructive"
                }
              >
                {detached
                  ? "→ Started in background"
                  : succeeded
                    ? "✓ Done"
                    : "✗ Didn't work"}
              </div>
              {detached ? (
                <div className="text-xs text-muted-foreground">
                  The command is still running and will keep going on its
                  own. Any output past this point isn't captured.
                </div>
              ) : combinedOutput ? (
                <pre className="text-xs bg-background/60 rounded p-2 max-h-48 overflow-y-auto whitespace-pre-wrap break-words font-mono">
                  {combinedOutput}
                </pre>
              ) : (
                <div className="text-xs text-muted-foreground">
                  {succeeded
                    ? "The command ran with no output."
                    : "The command finished with an error but printed nothing."}
                </div>
              )}
            </div>
          ) : null}

          {error ? (
            <div className="text-sm text-destructive break-words">{error}</div>
          ) : null}
        </div>

        <DialogFooter>
          {result ? (
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          ) : (
            <>
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
                variant={
                  warnings.length > 0 || failed ? "destructive" : "default"
                }
              >
                {running
                  ? silent
                    ? "Running…"
                    : "Opening…"
                  : silent
                    ? "Run"
                    : "Run in Terminal"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
