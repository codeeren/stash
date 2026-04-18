import { getDb } from "@/lib/db";
import { type TagRow, rowToTag } from "@/lib/rows";
import type { Tag } from "@/types";

export async function listTags(): Promise<Tag[]> {
  const db = await getDb();
  const rows = await db.select<TagRow[]>(
    "SELECT * FROM tags ORDER BY name",
  );
  return rows.map(rowToTag);
}

export async function listTagsForItem(itemId: number): Promise<Tag[]> {
  const db = await getDb();
  const rows = await db.select<TagRow[]>(
    `SELECT t.* FROM tags t
     JOIN item_tags it ON it.tag_id = t.id
     WHERE it.item_id = $1
     ORDER BY t.name`,
    [itemId],
  );
  return rows.map(rowToTag);
}

export async function getOrCreateTag(name: string): Promise<Tag> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("getOrCreateTag: empty tag name");

  const db = await getDb();
  const existing = await db.select<TagRow[]>(
    "SELECT * FROM tags WHERE name = $1",
    [trimmed],
  );
  if (existing[0]) return rowToTag(existing[0]);

  const res = await db.execute("INSERT INTO tags (name) VALUES ($1)", [
    trimmed,
  ]);
  return { id: res.lastInsertId as number, name: trimmed };
}

export async function setItemTags(
  itemId: number,
  tagNames: string[],
): Promise<void> {
  const db = await getDb();
  const unique = Array.from(
    new Set(tagNames.map((t) => t.trim()).filter(Boolean)),
  );

  const tags = await Promise.all(unique.map((name) => getOrCreateTag(name)));

  await db.execute("DELETE FROM item_tags WHERE item_id = $1", [itemId]);
  for (const tag of tags) {
    await db.execute(
      "INSERT INTO item_tags (item_id, tag_id) VALUES ($1, $2)",
      [itemId, tag.id],
    );
  }
}

export async function deleteTag(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM tags WHERE id = $1", [id]);
}
