import { getDb } from "@/lib/db";
import { type CategoryRow, rowToCategory } from "@/lib/rows";
import type { Category, CategoryUpdate, NewCategory } from "@/types";

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  const rows = await db.select<CategoryRow[]>(
    "SELECT * FROM categories ORDER BY sort_order, name",
  );
  return rows.map(rowToCategory);
}

export async function getCategory(id: number): Promise<Category | null> {
  const db = await getDb();
  const rows = await db.select<CategoryRow[]>(
    "SELECT * FROM categories WHERE id = $1",
    [id],
  );
  return rows[0] ? rowToCategory(rows[0]) : null;
}

export async function createCategory(input: NewCategory): Promise<Category> {
  const db = await getDb();
  const res = await db.execute(
    `INSERT INTO categories (name, icon, color, parent_id, sort_order)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      input.name,
      input.icon ?? null,
      input.color ?? null,
      input.parentId ?? null,
      input.sortOrder ?? 0,
    ],
  );
  const created = await getCategory(res.lastInsertId as number);
  if (!created)
    throw new Error("createCategory: row not found after insert");
  return created;
}

export async function updateCategory(
  id: number,
  patch: CategoryUpdate,
): Promise<Category> {
  const fields: string[] = [];
  const params: unknown[] = [];

  const set = (col: string, val: unknown) => {
    params.push(val);
    fields.push(`${col} = $${params.length}`);
  };

  if (patch.name !== undefined) set("name", patch.name);
  if (patch.icon !== undefined) set("icon", patch.icon);
  if (patch.color !== undefined) set("color", patch.color);
  if (patch.parentId !== undefined) set("parent_id", patch.parentId);
  if (patch.sortOrder !== undefined) set("sort_order", patch.sortOrder);

  if (fields.length === 0) {
    const existing = await getCategory(id);
    if (!existing) throw new Error(`updateCategory: category ${id} not found`);
    return existing;
  }

  params.push(id);
  const db = await getDb();
  await db.execute(
    `UPDATE categories SET ${fields.join(", ")} WHERE id = $${params.length}`,
    params,
  );

  const updated = await getCategory(id);
  if (!updated)
    throw new Error(`updateCategory: category ${id} not found after update`);
  return updated;
}

export async function deleteCategory(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM categories WHERE id = $1", [id]);
}
