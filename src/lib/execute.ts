import { invoke } from "@tauri-apps/api/core";
import { getDb } from "@/lib/db";

type SilentResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  // True when the command is still running and we returned without
  // waiting for it — the process keeps running in the background.
  detached: boolean;
};

export async function runCommand(
  itemId: number,
  resolved: string,
): Promise<void> {
  await invoke("execute_command", { command: resolved });

  const db = await getDb();
  await db.execute(
    `INSERT INTO executions (item_id, resolved_command, exit_code, output)
     VALUES ($1, $2, $3, $4)`,
    [itemId, resolved, null, "Opened in Terminal.app"],
  );
}

// Background, no Terminal. Returns exit code + truncated stdout/stderr so
// the dialog can show the result inline. Also logs to the executions table.
export async function runCommandSilent(
  itemId: number,
  resolved: string,
): Promise<SilentResult> {
  const raw = await invoke<{
    exit_code: number | null;
    stdout: string;
    stderr: string;
    detached: boolean;
  }>("execute_command_silent", { command: resolved });

  const result: SilentResult = {
    exitCode: raw.exit_code,
    stdout: raw.stdout,
    stderr: raw.stderr,
    detached: raw.detached,
  };

  const logged = result.detached
    ? "Started in background"
    : [result.stdout, result.stderr].filter(Boolean).join("\n");
  const db = await getDb();
  await db.execute(
    `INSERT INTO executions (item_id, resolved_command, exit_code, output)
     VALUES ($1, $2, $3, $4)`,
    [itemId, resolved, result.exitCode, logged.slice(0, 10_000)],
  );

  return result;
}
