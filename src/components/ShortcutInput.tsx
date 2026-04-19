import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  format,
  fromEvent,
  hasModifier,
  stringify,
} from "@/lib/shortcuts";

type ShortcutInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function ShortcutInput({
  value,
  onChange,
  placeholder,
}: ShortcutInputProps) {
  const [capturing, setCapturing] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const onKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === "Escape") {
      setCapturing(false);
      setHint(null);
      (e.currentTarget as HTMLElement).blur();
      return;
    }
    const s = fromEvent(e.nativeEvent);
    if (!s) return;
    if (!hasModifier(s)) {
      setHint("Include ⌘, ⌃, or ⌥ as a modifier.");
      return;
    }
    const str = stringify(s);
    onChange(str);
    setHint(null);
    setCapturing(false);
    (e.currentTarget as HTMLElement).blur();
  };

  const display = value ? format(value) : placeholder ?? "Not set";

  return (
    <div className="space-y-1">
      <button
        type="button"
        tabIndex={0}
        onClick={() => setCapturing(true)}
        onFocus={() => setCapturing(true)}
        onBlur={() => {
          setCapturing(false);
          setHint(null);
        }}
        onKeyDown={onKeyDown}
        className={cn(
          "w-full h-9 px-3 rounded-md border text-sm text-left font-mono transition-colors",
          capturing
            ? "border-primary ring-2 ring-ring/30"
            : "border-input hover:bg-accent/40",
        )}
      >
        {capturing ? (
          <span className="text-muted-foreground">Press keys…</span>
        ) : (
          <span>{display}</span>
        )}
      </button>
      {hint ? (
        <div className="text-xs text-destructive">{hint}</div>
      ) : capturing ? (
        <div className="text-xs text-muted-foreground">
          Press a combination including ⌘, ⌃, or ⌥. Esc to cancel.
        </div>
      ) : null}
    </div>
  );
}
