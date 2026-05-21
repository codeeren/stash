import { getDb } from "@/lib/db";
import {
  type ItemRow,
  type CategoryRow,
  type TagRow,
  type VariableRow,
  rowToItem,
  rowToCategory,
  rowToTag,
  rowToVariable,
} from "@/lib/rows";
import type { SortValue } from "@/lib/settings";
import type {
  Item,
  ItemUpdate,
  ItemWithRelations,
  NewItem,
  SearchFilters,
} from "@/types";

function orderByClause(sort: SortValue): string {
  switch (sort) {
    case "mostUsed":
      return "use_count DESC, COALESCE(last_used_at, created_at) DESC";
    case "newest":
      return "created_at DESC";
    case "alpha":
      return "LOWER(title) ASC";
    case "recent":
    default:
      return "COALESCE(last_used_at, created_at) DESC";
  }
}

function boolToInt(b: boolean | undefined): number | undefined {
  return b === undefined ? undefined : b ? 1 : 0;
}

export async function listItems(
  filters: SearchFilters = {},
  sort: SortValue = "recent",
): Promise<Item[]> {
  const db = await getDb();

  const where: string[] = [];
  const params: unknown[] = [];
  const push = (clause: string, value: unknown) => {
    params.push(value);
    where.push(clause.replace("?", `$${params.length}`));
  };

  if (filters.type) push("type = ?", filters.type);
  if (filters.categoryId !== undefined)
    push(
      filters.categoryId === null ? "category_id IS NULL" : "category_id = ?",
      filters.categoryId,
    );
  if (filters.favoritesOnly) where.push("is_favorite = 1");

  if (filters.tagIds && filters.tagIds.length > 0) {
    const placeholders = filters.tagIds.map((_, i) => `$${params.length + i + 1}`);
    where.push(
      `id IN (SELECT item_id FROM item_tags WHERE tag_id IN (${placeholders.join(",")}) GROUP BY item_id HAVING COUNT(DISTINCT tag_id) = ${filters.tagIds.length})`,
    );
    params.push(...filters.tagIds);
  }

  const sql = `SELECT * FROM items${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY ${orderByClause(sort)}`;
  const rows = await db.select<ItemRow[]>(sql, params);
  return rows.map(rowToItem);
}

export async function searchItems(
  query: string,
  filters: Omit<SearchFilters, "query"> = {},
): Promise<Item[]> {
  const trimmed = query.trim();
  if (!trimmed) return listItems(filters);

  const db = await getDb();
  const ftsQuery = buildFtsQuery(trimmed);

  const where: string[] = ["items_fts MATCH $1"];
  const params: unknown[] = [ftsQuery];

  if (filters.type) {
    params.push(filters.type);
    where.push(`i.type = $${params.length}`);
  }
  if (filters.categoryId !== undefined) {
    if (filters.categoryId === null) where.push("i.category_id IS NULL");
    else {
      params.push(filters.categoryId);
      where.push(`i.category_id = $${params.length}`);
    }
  }
  if (filters.favoritesOnly) where.push("i.is_favorite = 1");

  const sql = `
    SELECT i.* FROM items_fts fts
    JOIN items i ON i.id = fts.rowid
    WHERE ${where.join(" AND ")}
    ORDER BY fts.rank
  `;
  const rows = await db.select<ItemRow[]>(sql, params);
  return rows.map(rowToItem);
}

function buildFtsQuery(input: string): string {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `"${term.replace(/"/g, '""')}"*`)
    .join(" ");
}

export async function getItem(id: number): Promise<Item | null> {
  const db = await getDb();
  const rows = await db.select<ItemRow[]>("SELECT * FROM items WHERE id = $1", [
    id,
  ]);
  return rows[0] ? rowToItem(rows[0]) : null;
}

export async function getItemWithRelations(
  id: number,
): Promise<ItemWithRelations | null> {
  const item = await getItem(id);
  if (!item) return null;

  const db = await getDb();

  const [category, tags, variables] = await Promise.all([
    item.categoryId !== null
      ? db
          .select<CategoryRow[]>("SELECT * FROM categories WHERE id = $1", [
            item.categoryId,
          ])
          .then((r) => (r[0] ? rowToCategory(r[0]) : null))
      : Promise.resolve(null),
    db
      .select<TagRow[]>(
        "SELECT t.* FROM tags t JOIN item_tags it ON it.tag_id = t.id WHERE it.item_id = $1 ORDER BY t.name",
        [id],
      )
      .then((rows) => rows.map(rowToTag)),
    db
      .select<VariableRow[]>(
        "SELECT * FROM variables WHERE item_id = $1 ORDER BY sort_order, id",
        [id],
      )
      .then((rows) => rows.map(rowToVariable)),
  ]);

  return { ...item, category, tags, variables };
}

export async function createItem(input: NewItem): Promise<Item> {
  const db = await getDb();
  const res = await db.execute(
    `INSERT INTO items (type, title, content, language, description, category_id, is_favorite)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      input.type,
      input.title,
      input.content,
      input.language ?? null,
      input.description ?? null,
      input.categoryId ?? null,
      boolToInt(input.isFavorite) ?? 0,
    ],
  );
  const created = await getItem(res.lastInsertId as number);
  if (!created) throw new Error("createItem: row not found after insert");
  return created;
}

export async function updateItem(
  id: number,
  patch: ItemUpdate,
): Promise<Item> {
  const fields: string[] = [];
  const params: unknown[] = [];

  const set = (col: string, val: unknown) => {
    params.push(val);
    fields.push(`${col} = $${params.length}`);
  };

  if (patch.type !== undefined) set("type", patch.type);
  if (patch.title !== undefined) set("title", patch.title);
  if (patch.content !== undefined) set("content", patch.content);
  if (patch.language !== undefined) set("language", patch.language);
  if (patch.description !== undefined) set("description", patch.description);
  if (patch.categoryId !== undefined) set("category_id", patch.categoryId);
  if (patch.isFavorite !== undefined)
    set("is_favorite", boolToInt(patch.isFavorite));

  if (fields.length === 0) {
    const existing = await getItem(id);
    if (!existing) throw new Error(`updateItem: item ${id} not found`);
    return existing;
  }

  fields.push("updated_at = CURRENT_TIMESTAMP");
  params.push(id);

  const db = await getDb();
  await db.execute(
    `UPDATE items SET ${fields.join(", ")} WHERE id = $${params.length}`,
    params,
  );

  const updated = await getItem(id);
  if (!updated) throw new Error(`updateItem: item ${id} not found after update`);
  return updated;
}

export async function deleteItem(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM items WHERE id = $1", [id]);
}

export async function toggleFavorite(id: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE items SET is_favorite = 1 - is_favorite WHERE id = $1",
    [id],
  );
}

export async function duplicateItem(id: number): Promise<Item> {
  const full = await getItemWithRelations(id);
  if (!full) throw new Error(`duplicateItem: item ${id} not found`);

  const copy = await createItem({
    type: full.type,
    title: `${full.title} (copy)`,
    content: full.content,
    language: full.language ?? undefined,
    description: full.description ?? undefined,
    categoryId: full.categoryId ?? undefined,
    isFavorite: false,
  });

  if (full.tags.length > 0) {
    const { setItemTags } = await import("@/lib/tags");
    await setItemTags(
      copy.id,
      full.tags.map((t) => t.name),
    );
  }

  if (full.variables.length > 0) {
    const { setItemVariables } = await import("@/lib/variables");
    await setItemVariables(
      copy.id,
      full.variables.map((v) => ({
        name: v.name,
        label: v.label ?? undefined,
        placeholder: v.placeholder ?? undefined,
        defaultValue: v.defaultValue ?? undefined,
        fieldType: v.fieldType,
        options: v.options ?? undefined,
        sortOrder: v.sortOrder,
      })),
    );
  }

  return copy;
}

export async function recordItemUse(id: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE items SET use_count = use_count + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = $1",
    [id],
  );
}
