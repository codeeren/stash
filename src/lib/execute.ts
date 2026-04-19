import { invoke } from "@tauri-apps/api/core";
import { getDb } from "@/lib/db";

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
