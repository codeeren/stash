import { getCurrentWindow } from "@tauri-apps/api/window";

import { cn } from "@/lib/utils";

// Invisible strip placed at the top of each main panel. The
// `data-tauri-drag-region` attribute is the documented way to make a
// region draggable; the explicit mousedown handler is a belt-and-braces
// fallback because the attribute alone has been flaky for us on this
// build of macOS Sequoia. Together they reliably move the window.
export function DragRegion({ className }: { className?: string }) {
  return (
    <div
      data-tauri-drag-region
      onMouseDown={(e) => {
        if (e.button === 0) {
          void getCurrentWindow().startDragging();
        }
      }}
      className={cn("h-9 shrink-0", className)}
    />
  );
}
