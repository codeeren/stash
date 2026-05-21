// Drag-and-drop helpers for moving items between categories. Items are
// dragged from the list and dropped onto a sidebar category (or the
// Uncategorized row).

const ITEM_MIME = "application/x-stash-item";

export function setDraggedItem(dt: DataTransfer, itemId: number): void {
  dt.setData(ITEM_MIME, String(itemId));
  dt.effectAllowed = "move";
}

// Readable on `drop` (WebKit blocks reading custom types during `dragover`,
// so an in-progress drag is tracked separately via the UI store).
export function getDraggedItemId(dt: DataTransfer): number | null {
  const raw = dt.getData(ITEM_MIME);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
