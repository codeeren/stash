use tauri_plugin_sql::{Migration, MigrationKind};

pub fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "initial_schema",
        sql: INITIAL_SCHEMA,
        kind: MigrationKind::Up,
    }]
}

const INITIAL_SCHEMA: &str = r#"
-- categories first (items references it)
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('command', 'prompt', 'snippet', 'note')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    language TEXT,
    description TEXT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    is_favorite BOOLEAN DEFAULT 0,
    use_count INTEGER DEFAULT 0,
    last_used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_items_type ON items(type);
CREATE INDEX idx_items_category ON items(category_id);
CREATE INDEX idx_items_favorite ON items(is_favorite) WHERE is_favorite = 1;
CREATE INDEX idx_items_last_used ON items(last_used_at DESC);

CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE item_tags (
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, tag_id)
);

CREATE INDEX idx_item_tags_tag ON item_tags(tag_id);

CREATE TABLE variables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    label TEXT,
    placeholder TEXT,
    default_value TEXT,
    field_type TEXT DEFAULT 'text' CHECK(field_type IN ('text', 'textarea', 'file', 'select', 'number')),
    options TEXT,
    sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_variables_item ON variables(item_id);

CREATE TABLE executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
    resolved_command TEXT NOT NULL,
    exit_code INTEGER,
    output TEXT,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_executions_item ON executions(item_id);
CREATE INDEX idx_executions_time ON executions(executed_at DESC);

-- Full-text search over items
CREATE VIRTUAL TABLE items_fts USING fts5(
    title, content, description,
    content='items', content_rowid='id'
);

-- FTS sync triggers
CREATE TRIGGER items_ai AFTER INSERT ON items BEGIN
    INSERT INTO items_fts(rowid, title, content, description)
    VALUES (new.id, new.title, new.content, new.description);
END;

CREATE TRIGGER items_ad AFTER DELETE ON items BEGIN
    DELETE FROM items_fts WHERE rowid = old.id;
END;

CREATE TRIGGER items_au AFTER UPDATE ON items BEGIN
    DELETE FROM items_fts WHERE rowid = old.id;
    INSERT INTO items_fts(rowid, title, content, description)
    VALUES (new.id, new.title, new.content, new.description);
END;

-- updated_at auto-maintenance
CREATE TRIGGER items_set_updated_at AFTER UPDATE ON items
FOR EACH ROW WHEN old.updated_at = new.updated_at BEGIN
    UPDATE items SET updated_at = CURRENT_TIMESTAMP WHERE id = new.id;
END;
"#;
