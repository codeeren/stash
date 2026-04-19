import { getDb } from "@/lib/db";
import type {
  CategoryRow,
  ItemRow,
  TagRow,
  VariableRow,
} from "@/lib/rows";

export const BACKUP_VERSION = 1;

type ItemTagRow = { item_id: number; tag_id: number };
type SettingRow = { key: string; value: string };

export type Backup = {
  version: number;
  exportedAt: string;
  categories: CategoryRow[];
  items: ItemRow[];
  tags: TagRow[];
  itemTags: ItemTagRow[];
  variables: VariableRow[];
  settings: SettingRow[];
};

export async function exportBackup(): Promise<Backup> {
  const db = await getDb();
  const [categories, items, tags, itemTags, variables, settings] =
    await Promise.all([
      db.select<CategoryRow[]>("SELECT * FROM categories"),
      db.select<ItemRow[]>("SELECT * FROM items"),
      db.select<TagRow[]>("SELECT * FROM tags"),
      db.select<ItemTagRow[]>("SELECT * FROM item_tags"),
      db.select<VariableRow[]>("SELECT * FROM variables"),
      db.select<SettingRow[]>("SELECT key, value FROM settings"),
    ]);

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    categories,
    items,
    tags,
    itemTags,
    variables,
    settings,
  };
}

function isBackup(x: unknown): x is Backup {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.version === "number" &&
    Array.isArray(o.categories) &&
    Array.isArray(o.items) &&
    Array.isArray(o.tags) &&
    Array.isArray(o.itemTags) &&
    Array.isArray(o.variables)
  );
}

export async function importBackup(json: string): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Not valid JSON.");
  }
  if (!isBackup(parsed)) {
    throw new Error("This file is not a Stash backup.");
  }
  if (parsed.version !== BACKUP_VERSION) {
    throw new Error(
      `Unsupported backup version (got ${parsed.version}, expected ${BACKUP_VERSION}).`,
    );
  }

  const db = await getDb();
  await doImport(db, parsed);
}

async function doImport(
  db: Awaited<ReturnType<typeof getDb>>,
  parsed: Backup,
): Promise<void> {
  const validCategoryIds = new Set<number>();
  const categoriesById = new Map<number, CategoryRow>();
  for (const c of parsed.categories) {
    categoriesById.set(c.id, c);
    validCategoryIds.add(c.id);
  }
  const insertableCategories: CategoryRow[] = parsed.categories.map((c) => ({
    ...c,
    parent_id:
      c.parent_id != null && validCategoryIds.has(c.parent_id)
        ? c.parent_id
        : null,
  }));

  const validItemIds = new Set<number>(parsed.items.map((i) => i.id));
  const validTagIds = new Set<number>(parsed.tags.map((t) => t.id));

  const insertableItems: ItemRow[] = parsed.items.map((i) => ({
    ...i,
    category_id:
      i.category_id != null && validCategoryIds.has(i.category_id)
        ? i.category_id
        : null,
  }));

  const insertableItemTags = parsed.itemTags.filter(
    (it) => validItemIds.has(it.item_id) && validTagIds.has(it.tag_id),
  );

  const insertableVariables = parsed.variables.filter((v) =>
    validItemIds.has(v.item_id),
  );

  await db.execute("DELETE FROM item_tags");
  await db.execute("DELETE FROM variables");
  await db.execute("DELETE FROM executions");
  await db.execute("DELETE FROM items");
  await db.execute("DELETE FROM tags");
  await db.execute("DELETE FROM categories");

  for (const c of insertableCategories) {
    await db.execute(
      `INSERT INTO categories (id, name, icon, color, parent_id, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [c.id, c.name, c.icon, c.color, c.parent_id, c.sort_order],
    );
  }

  for (const i of insertableItems) {
    await db.execute(
      `INSERT INTO items
         (id, type, title, content, language, description, category_id,
          is_favorite, use_count, last_used_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        i.id,
        i.type,
        i.title,
        i.content,
        i.language,
        i.description,
        i.category_id,
        i.is_favorite,
        i.use_count,
        i.last_used_at,
        i.created_at,
        i.updated_at,
      ],
    );
  }

  for (const t of parsed.tags) {
    await db.execute("INSERT INTO tags (id, name) VALUES ($1, $2)", [
      t.id,
      t.name,
    ]);
  }

  for (const it of insertableItemTags) {
    await db.execute(
      "INSERT INTO item_tags (item_id, tag_id) VALUES ($1, $2)",
      [it.item_id, it.tag_id],
    );
  }

  for (const v of insertableVariables) {
    await db.execute(
      `INSERT INTO variables
         (id, item_id, name, label, placeholder, default_value, field_type, options, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        v.id,
        v.item_id,
        v.name,
        v.label,
        v.placeholder,
        v.default_value,
        v.field_type,
        v.options,
        v.sort_order,
      ],
    );
  }

  if (parsed.settings) {
    for (const s of parsed.settings) {
      await db.execute(
        `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [s.key, s.value],
      );
    }
  }
}

export function downloadBackupFile(backup: Backup): void {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = backup.exportedAt.replace(/[:.]/g, "-");
  a.href = url;
  a.download = `stash-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
