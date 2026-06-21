import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";

export type UpdateState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "none" }
  | { kind: "available"; version: string; notes?: string }
  | { kind: "downloading"; percent: number }
  | { kind: "ready" }
  | { kind: "error"; message: string };

// Check GitHub for a newer release. Returns the pending update (or null),
// which the caller can then install.
export async function checkForUpdate() {
  return check();
}

// Download + install the given update, reporting download progress, then
// relaunch into the new version.
export async function installUpdate(
  update: NonNullable<Awaited<ReturnType<typeof check>>>,
  onProgress: (percent: number) => void,
): Promise<void> {
  let total = 0;
  let received = 0;
  await update.downloadAndInstall((event) => {
    if (event.event === "Started") {
      total = event.data.contentLength ?? 0;
    } else if (event.event === "Progress") {
      received += event.data.chunkLength;
      if (total > 0) onProgress(Math.round((received / total) * 100));
    } else if (event.event === "Finished") {
      onProgress(100);
    }
  });
  await relaunch();
}
