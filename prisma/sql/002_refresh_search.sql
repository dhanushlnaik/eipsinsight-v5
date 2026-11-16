-- ─────────────────────────────────────────────────────────────
-- Populate / refresh the search index from scheduler-owned tables.
-- READ-ONLY against scheduler tables (pure SELECT); writes only to
-- search_entities, the one table v5 owns.
--
-- Idempotent: every block is an UPSERT that only touches a row when
-- something a reader can see has changed, so running it every few
-- minutes costs almost nothing once the index is warm.
-- ─────────────────────────────────────────────────────────────

-- EIPs & ERCs (shared `eips` table, split by repo) ───────────────
INSERT INTO search_entities (entity_type, entity_id, title, subtitle, body, status, url, updated_at)
SELECT DISTINCT ON (e.id)
  kind.t AS entity_type,
  e.eip_number::text AS entity_id,
  upper(kind.t) || '-' || e.eip_number || ': ' || coalesce(e.title, '') AS title,
  e.author AS subtitle,
  coalesce(e.title, '') || ' ' || coalesce(e.author, '') || ' '
    || coalesce(s.status, '') || ' ' || coalesce(s.type, '') || ' ' || coalesce(s.category, '') AS body,
  s.status AS status,
  '/' || kind.t || '/' || e.eip_number AS url,
  coalesce(s.updated_at, e.created_at, now()) AS updated_at
FROM eips e
JOIN eip_snapshots s ON s.eip_id = e.id
JOIN repositories r ON r.id = s.repository_id
CROSS JOIN LATERAL (
  SELECT CASE lower(split_part(r.name, '/', 2))
           WHEN 'ercs' THEN 'erc'
           WHEN 'rips' THEN 'rip'
           ELSE 'eip'
         END AS t
) kind
ORDER BY e.id, s.updated_at DESC NULLS LAST
ON CONFLICT (entity_type, entity_id) DO UPDATE SET
  title = excluded.title, subtitle = excluded.subtitle, body = excluded.body,
  status = excluded.status, url = excluded.url, updated_at = excluded.updated_at
WHERE (search_entities.title, search_entities.subtitle, search_entities.body, search_entities.status)
  IS DISTINCT FROM (excluded.title, excluded.subtitle, excluded.body, excluded.status);

-- RIPs (their own `rips` table) ──────────────────────────────────
INSERT INTO search_entities (entity_type, entity_id, title, subtitle, body, status, url, updated_at)
SELECT
  'rip',
  rip_number::text,
  'RIP-' || rip_number || ': ' || coalesce(title, ''),
  author,
  coalesce(title, '') || ' ' || coalesce(author, '') || ' ' || coalesce(status, '') || ' rollup',
  status,
  '/rip/' || rip_number,
  coalesce(created_at, now())
FROM rips
WHERE title IS NOT NULL AND title <> ''
ON CONFLICT (entity_type, entity_id) DO UPDATE SET
  title = excluded.title, subtitle = excluded.subtitle, body = excluded.body,
  status = excluded.status, url = excluded.url, updated_at = excluded.updated_at
WHERE (search_entities.title, search_entities.subtitle, search_entities.body, search_entities.status)
  IS DISTINCT FROM (excluded.title, excluded.subtitle, excluded.body, excluded.status);

-- Contributors ───────────────────────────────────────────────────
INSERT INTO search_entities (entity_type, entity_id, title, subtitle, body, status, url, updated_at)
SELECT DISTINCT ON (actor)
  'contributor', actor, actor, 'Contributor', actor, NULL,
  '/user/' || actor, coalesce(last_activity, now())
FROM contributor_scores
WHERE actor IS NOT NULL AND actor <> ''
ORDER BY actor, total_score DESC NULLS LAST
ON CONFLICT (entity_type, entity_id) DO UPDATE SET
  title = excluded.title, subtitle = excluded.subtitle, body = excluded.body,
  url = excluded.url, updated_at = excluded.updated_at
WHERE search_entities.updated_at IS DISTINCT FROM excluded.updated_at;

-- Network upgrades ───────────────────────────────────────────────
INSERT INTO search_entities (entity_type, entity_id, title, subtitle, body, status, url, updated_at)
SELECT 'upgrade', slug, name, 'Network upgrade', name || ' ' || slug, NULL,
  '/upgrade/' || slug, coalesce(created_at, now())
FROM upgrades
WHERE slug IS NOT NULL
ON CONFLICT (entity_type, entity_id) DO UPDATE SET
  title = excluded.title, subtitle = excluded.subtitle, body = excluded.body,
  url = excluded.url, updated_at = excluded.updated_at
WHERE (search_entities.title, search_entities.body) IS DISTINCT FROM (excluded.title, excluded.body);

-- Pull requests ──────────────────────────────────────────────────
-- Numbers repeat across repositories, so the id carries the repo: "eips-9145".
-- The body holds what people search a PR by: title, author, number, labels.
INSERT INTO search_entities (entity_type, entity_id, title, subtitle, body, status, url, updated_at)
SELECT
  'pr',
  lower(split_part(r.name, '/', 2)) || '-' || pr.pr_number,
  coalesce(nullif(pr.title, ''), 'Pull request #' || pr.pr_number),
  r.name || ' #' || pr.pr_number || coalesce(' · ' || nullif(pr.author, ''), ''),
  coalesce(pr.title, '') || ' ' || coalesce(pr.author, '') || ' ' || pr.pr_number
    || ' ' || array_to_string(coalesce(pr.labels, '{}'), ' '),
  CASE
    WHEN pr.merged_at IS NOT NULL THEN 'Merged'
    WHEN lower(coalesce(pr.state, '')) = 'open' THEN 'Open'
    ELSE 'Closed'
  END,
  '/pr/' || lower(split_part(r.name, '/', 2)) || '/' || pr.pr_number,
  coalesce(pr.updated_at, pr.created_at, now())
FROM pull_requests pr
JOIN repositories r ON r.id = pr.repository_id
ON CONFLICT (entity_type, entity_id) DO UPDATE SET
  title = excluded.title, subtitle = excluded.subtitle, body = excluded.body,
  status = excluded.status, url = excluded.url, updated_at = excluded.updated_at
WHERE (search_entities.title, search_entities.subtitle, search_entities.body, search_entities.status)
  IS DISTINCT FROM (excluded.title, excluded.subtitle, excluded.body, excluded.status);

-- Issues ─────────────────────────────────────────────────────────
INSERT INTO search_entities (entity_type, entity_id, title, subtitle, body, status, url, updated_at)
SELECT
  'issue',
  lower(split_part(r.name, '/', 2)) || '-' || i.issue_number,
  coalesce(nullif(i.title, ''), 'Issue #' || i.issue_number),
  r.name || ' #' || i.issue_number || coalesce(' · ' || nullif(i.author, ''), ''),
  coalesce(i.title, '') || ' ' || coalesce(i.author, '') || ' ' || i.issue_number
    || ' ' || array_to_string(coalesce(i.labels, '{}'), ' '),
  CASE WHEN lower(coalesce(i.state, '')) = 'open' THEN 'Open' ELSE 'Closed' END,
  '/issue/' || lower(split_part(r.name, '/', 2)) || '/' || i.issue_number,
  coalesce(i.updated_at, i.created_at, now())
FROM issues i
JOIN repositories r ON r.id = i.repository_id
ON CONFLICT (entity_type, entity_id) DO UPDATE SET
  title = excluded.title, subtitle = excluded.subtitle, body = excluded.body,
  status = excluded.status, url = excluded.url, updated_at = excluded.updated_at
WHERE (search_entities.title, search_entities.subtitle, search_entities.body, search_entities.status)
  IS DISTINCT FROM (excluded.title, excluded.subtitle, excluded.body, excluded.status);

-- Housekeeping: drop rows whose source record is gone ────────────
DELETE FROM search_entities se
WHERE se.entity_type = 'pr'
  AND NOT EXISTS (
    SELECT 1 FROM pull_requests pr JOIN repositories r ON r.id = pr.repository_id
    WHERE lower(split_part(r.name, '/', 2)) || '-' || pr.pr_number = se.entity_id
  );
DELETE FROM search_entities se
WHERE se.entity_type = 'issue'
  AND NOT EXISTS (
    SELECT 1 FROM issues i JOIN repositories r ON r.id = i.repository_id
    WHERE lower(split_part(r.name, '/', 2)) || '-' || i.issue_number = se.entity_id
  );
