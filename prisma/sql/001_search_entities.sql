-- ─────────────────────────────────────────────────────────────
-- EIPsInsight v5 · Phase 0 · the ONE table v5 owns
-- Safe to run on the shared DB: it only CREATEs a new table + indexes.
-- It never alters any scheduler-owned table. Run once.
-- ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS search_entities (
  entity_type text        NOT NULL,     -- eip | erc | rip | pr | issue | contributor | upgrade | blog
  entity_id   text        NOT NULL,
  title       text        NOT NULL,
  subtitle    text,
  body        text        NOT NULL DEFAULT '',
  status      text,
  url         text        NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  fts tsvector GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' || coalesce(subtitle, '') || ' ' || coalesce(body, ''))
  ) STORED,
  PRIMARY KEY (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS search_entities_fts_idx
  ON search_entities USING gin (fts);
CREATE INDEX IF NOT EXISTS search_entities_title_trgm_idx
  ON search_entities USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS search_entities_type_idx
  ON search_entities (entity_type);
CREATE INDEX IF NOT EXISTS search_entities_updated_idx
  ON search_entities (updated_at DESC);
