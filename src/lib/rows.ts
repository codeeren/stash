import type {
  Category,
  Item,
  ItemType,
  Tag,
  Variable,
  VariableFieldType,
} from "@/types";

export type ItemRow = {
  id: number;
  type: ItemType;
  title: string;
  content: string;
  language: string | null;
  description: string | null;
  category_id: number | null;
  is_favorite: number;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CategoryRow = {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
  parent_id: number | null;
  sort_order: number;
};

export type TagRow = {
  id: number;
  name: string;
};

export type VariableRow = {
  id: number;
  item_id: number;
  name: string;
  label: string | null;
  placeholder: string | null;
  default_value: string | null;
  field_type: VariableFieldType;
  options: string | null;
  sort_order: number;
};

export function rowToItem(r: ItemRow): Item {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    content: r.content,
    language: r.language,
    description: r.description,
    categoryId: r.category_id,
    isFavorite: Boolean(r.is_favorite),
    useCount: r.use_count,
    lastUsedAt: r.last_used_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function rowToCategory(r: CategoryRow): Category {
  return {
    id: r.id,
    name: r.name,
    icon: r.icon,
    color: r.color,
    parentId: r.parent_id,
    sortOrder: r.sort_order,
  };
}

export function rowToTag(r: TagRow): Tag {
  return { id: r.id, name: r.name };
}

export function rowToVariable(r: VariableRow): Variable {
  return {
    id: r.id,
    itemId: r.item_id,
    name: r.name,
    label: r.label,
    placeholder: r.placeholder,
    defaultValue: r.default_value,
    fieldType: r.field_type,
    options: r.options ? (JSON.parse(r.options) as string[]) : null,
    sortOrder: r.sort_order,
  };
}
