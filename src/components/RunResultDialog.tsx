import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/uiStore";

// Shown after a silent run that the user needs to see: it failed, or it
// printed output. A clean, quiet success never reaches here — it gets a
// toast instead.
export function RunResultDialog() {
  const runResult = useUiStore((s) => s.runResult);
  const setRunResult = useUiStore((s) => s.setRunResult);

  const open = runResult !== null;
  const close = () => setRunResult(null);

  const result = runResult?.result ?? null;
  const detached = result?.detached === true;
  const succeeded = result !== null && !result.detached && result.exitCode === 0;
  const output = result
    ? [result.stdout, result.stderr].filter(Boolean).join("\n").trim()
    : "";

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : close())}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {runResult?.error || (!detached && !succeeded)
              ? "Command failed"
              : "Command output"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
              Command
            </div>
            <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-words font-mono">
              {runResult?.command}
            </pre>
          </div>

          {runResult?.error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 space-y-1">
              <div className="text-sm font-medium text-destructive">
                ✗ Couldn't run
              </div>
              <div className="text-xs text-destructive/90 break-words">
                {runResult.error}
              </div>
            </div>
          ) : result ? (
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
              {output ? (
                <pre className="text-xs bg-background/60 rounded p-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words font-mono">
                  {output}
                </pre>
              ) : (
                <div className="text-xs text-muted-foreground">
                  The command finished with an error but printed nothing.
                </div>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button onClick={close}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
