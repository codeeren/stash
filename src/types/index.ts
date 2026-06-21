export type ItemType = "command" | "prompt" | "snippet" | "note";

export type VariableFieldType =
  | "text"
  | "textarea"
  | "file"
  | "select"
  | "number";

export type Item = {
  id: number;
  type: ItemType;
  title: string;
  content: string;
  language: string | null;
  description: string | null;
  categoryId: number | null;
  isFavorite: boolean;
  // Commands only: when true, run silently in the background instead of
  // opening Terminal. Opt-in per item.
  silent: boolean;
  // Privacy gate (not encryption): when true, the content is hidden
  // behind a passphrase prompt. lockHash is SHA-256 of the passphrase.
  locked: boolean;
  lockHash: string | null;
  useCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewItem = {
  type: ItemType;
  title: string;
  content: string;
  language?: string | null;
  description?: string | null;
  categoryId?: number | null;
  isFavorite?: boolean;
  silent?: boolean;
  locked?: boolean;
  lockHash?: string | null;
};

export type ItemUpdate = Partial<
  Pick<
    Item,
    | "type"
    | "title"
    | "content"
    | "language"
    | "description"
    | "categoryId"
    | "isFavorite"
    | "silent"
    | "locked"
    | "lockHash"
  >
>;

export type Category = {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
  parentId: number | null;
  sortOrder: number;
};

export type NewCategory = {
  name: string;
  icon?: string | null;
  color?: string | null;
  parentId?: number | null;
  sortOrder?: number;
};

export type CategoryUpdate = Partial<
  Pick<Category, "name" | "icon" | "color" | "parentId" | "sortOrder">
>;

export type Tag = {
  id: number;
  name: string;
};

export type Variable = {
  id: number;
  itemId: number;
  name: string;
  label: string | null;
  placeholder: string | null;
  defaultValue: string | null;
  fieldType: VariableFieldType;
  options: string[] | null;
  sortOrder: number;
};

export type NewVariable = {
  itemId: number;
  name: string;
  label?: string | null;
  placeholder?: string | null;
  defaultValue?: string | null;
  fieldType?: VariableFieldType;
  options?: string[] | null;
  sortOrder?: number;
};

export type Execution = {
  id: number;
  itemId: number | null;
  resolvedCommand: string;
  exitCode: number | null;
  output: string | null;
  executedAt: string;
};

export type ItemWithRelations = Item & {
  category: Category | null;
  tags: Tag[];
  variables: Variable[];
};

export type SearchFilters = {
  query?: string;
  type?: ItemType;
  categoryId?: number | null;
  tagIds?: number[];
  favoritesOnly?: boolean;
};
