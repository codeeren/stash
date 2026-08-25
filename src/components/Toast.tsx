import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";

// A single, short-lived chip at the bottom of the window. Used for
// confirmations that don't deserve a dialog — chiefly "✓ Done" after a
// silent command has run without asking anything.
export function Toast() {
  const toast = useUiStore((s) => s.toast);
  const dismissToast = useUiStore((s) => s.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const id = toast.id;
    const timer = setTimeout(() => dismissToast(id), 1800);
    return () => clearTimeout(timer);
  }, [toast, dismissToast]);

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center">
      <div
        key={toast.id}
        className={cn(
          "stash-toast rounded-full border px-4 py-1.5 text-xs font-medium shadow-lg backdrop-blur-sm",
          toast.kind === "success"
            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
            : "border-destructive/40 bg-destructive/15 text-destructive",
        )}
      >
        {toast.text}
      </div>
    </div>
  );
}
