import { invoke } from "@tauri-apps/api/core";
import { runCommandSilent } from "@/lib/execute";
import { recordItemUse } from "@/lib/items";
import { useUiStore } from "@/stores/uiStore";

// Flash a short status next to the menu bar icon, then clear it. Used when
// a run was launched from the tray and the main window stays hidden, so an
// in-window toast would be invisible.
async function flashTrayTitle(title: string) {
  try {
    await invoke("set_tray_title", { title });
    setTimeout(() => {
      void invoke("set_tray_title", { title: "" });
    }, 1500);
  } catch {
    // Best-effort — the run itself already happened.
  }
}

/**
 * Run a command marked "silent" — no confirmation, no Terminal window.
 *
 * The pre-flight dialog is deliberately skipped here: the user opted this
 * item into silent mode in the editor, where the warning lives. The run is
 * still logged to the `executions` table like every other execution.
 *
 * Feedback is proportional to the outcome: a clean, output-less run gets a
 * brief "✓ Done" chip, anything else (output, non-zero exit, or a failure
 * to launch at all) opens the result dialog so it can be read.
 */
export async function runItemSilently(
  itemId: number,
  command: string,
  opts: { fromTray?: boolean } = {},
): Promise<void> {
  const { showToast, setRunResult, bumpItems } = useUiStore.getState();
  const fromTray = opts.fromTray === true;

  try {
    const result = await runCommandSilent(itemId, command);
    await recordItemUse(itemId);
    bumpItems();

    const output = [result.stdout, result.stderr]
      .filter(Boolean)
      .join("\n")
      .trim();

    if (result.detached) {
      showToast("→ Started in background");
      if (fromTray) void flashTrayTitle("→ Running");
      return;
    }

    if (result.exitCode === 0 && !output) {
      showToast("✓ Done");
      if (fromTray) void flashTrayTitle("✓ Done");
      return;
    }

    if (fromTray) {
      await invoke("show_main_window").catch(() => {});
    }
    setRunResult({ command, result, error: null });
  } catch (e) {
    if (fromTray) {
      await invoke("show_main_window").catch(() => {});
    }
    setRunResult({ command, result: null, error: String(e) });
  }
}
