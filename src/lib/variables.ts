import { getDb } from "@/lib/db";
import { type VariableRow, rowToVariable } from "@/lib/rows";
import type { NewVariable, Variable } from "@/types";

export async function listVariablesForItem(
  itemId: number,
): Promise<Variable[]> {
  const db = await getDb();
  const rows = await db.select<VariableRow[]>(
    "SELECT * FROM variables WHERE item_id = $1 ORDER BY sort_order, id",
    [itemId],
  );
  return rows.map(rowToVariable);
}

export async function setItemVariables(
  itemId: number,
  vars: Omit<NewVariable, "itemId">[],
): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM variables WHERE item_id = $1", [itemId]);

  for (let i = 0; i < vars.length; i++) {
    const v = vars[i];
    await db.execute(
      `INSERT INTO variables
         (item_id, name, label, placeholder, default_value, field_type, options, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        itemId,
        v.name,
        v.label ?? null,
        v.placeholder ?? null,
        v.defaultValue ?? null,
        v.fieldType ?? "text",
        v.options ? JSON.stringify(v.options) : null,
        v.sortOrder ?? i,
      ],
    );
  }
}

export function extractVariableNames(content: string): string[] {
  const matches = content.matchAll(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g);
  const names = new Set<string>();
  for (const m of matches) names.add(m[1]);
  return Array.from(names);
}

export function resolveVariables(
  content: string,
  values: Record<string, string>,
): string {
  return content.replace(
    /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g,
    (_, name: string) => values[name] ?? "",
  );
}
