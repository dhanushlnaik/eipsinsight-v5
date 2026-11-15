import { query } from "@/lib/db";

export type Kind = "eip" | "erc" | "rip";

export interface StatusEvent {
  from_status: string | null;
  to_status: string;
  pr_number: number | null;
  changed_at: string;
}

export interface Author {
  name: string;
  handle: string | null;
}

export interface Ref {
  kind: Kind;
  number: number;
  title: string;
}

export interface UpgradeRef {
  slug: string;
  name: string;
  bucket: string;
}

export interface EditorialPR {
  pr_number: number;
  /** Full repository name the PR lives in, e.g. "ethereum/ERCs". Not always the proposal's own repo. */
  repo: string;
  title: string;
  state: string;
  merged: boolean;
  author: string | null;
  updated_at: string;
  /** true when the PR title references this proposal (a direct edit), vs a mention elsewhere. */
  edits: boolean;
}

export interface Meeting {
  title: string;
  date: string | null;
  url: string;
  snippet: string | null;
  mentionedBy: string | null;
}

export interface Heading {
  depth: number;
  text: string;
  slug: string;
}

export interface Entity {
  kind: Kind;
  number: number;
  title: string;
  description: string | null;
  abstract: string | null;
  content: string | null;
  headings: Heading[];
  authors: Author[];
  created_at: string | null;
  status: string | null;
  type: string | null;
  category: string | null;
  layer: string | null;
  deadline: string | null;
  requires: number[];
  requiredBy: Ref[];
  upgrades: UpgradeRef[];
  updated_at: string | null;
  repo: string;
  githubUrl: string | null;
  officialUrl: string;
  events: StatusEvent[];
  editorialPRs: EditorialPR[];
  meetings: Meeting[];
}

interface Source {
  description: string | null;
  abstract: string | null;
  content: string | null;
  headings: Heading[];
}

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

/** Best-effort: pull the description, abstract, full body + headings from source markdown. Never throws. */
async function fetchSource(repo: string, filePath: string | null): Promise<Source> {
  const empty: Source = { description: null, abstract: null, content: null, headings: [] };
  if (!repo || !filePath) return empty;
  try {
    const res = await fetch(`https://raw.githubusercontent.com/${repo}/master/${filePath}`, {
      signal: AbortSignal.timeout(4500),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return empty;
    const md = await res.text();

    const fm = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    let description: string | null = null;
    if (fm) {
      const d = fm[1].match(/^description:\s*(.+)$/m);
      if (d) description = d[1].trim().replace(/^["']|["']$/g, "") || null;
    }

    const body = md.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "").trim();

    let abstract = body.match(/##\s*Abstract\s*\n+([\s\S]*?)(\n#{1,2}\s|$)/i)?.[1] ?? "";
    abstract = abstract.replace(/\r/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_`]/g, "").replace(/\s+/g, " ").trim();
    if (abstract.length > 420) abstract = abstract.slice(0, 420).replace(/\s+\S*$/, "") + "…";

    const noCode = body.replace(/```[\s\S]*?```/g, "");
    const headings: Heading[] = [];
    for (const m of noCode.matchAll(/^(#{2,3})\s+(.+)$/gm)) {
      const text = m[2].replace(/[*_`]/g, "").trim();
      headings.push({ depth: m[1].length, text, slug: slugify(text) });
    }

    return { description, abstract: abstract || null, content: body, headings };
  } catch {
    return empty;
  }
}

function parseAuthors(raw: string | null): Author[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const handle = chunk.match(/@([A-Za-z0-9-]+)/)?.[1] ?? null;
      const name = chunk.replace(/\s*[(<].*$/, "").trim() || chunk;
      return { name, handle };
    });
}

function officialUrl(kind: Kind, n: number): string {
  if (kind === "erc") return `https://ercs.ethereum.org/ERCS/erc-${n}`;
  if (kind === "rip") return `https://rips.ethereum.org/RIPS/rip-${n}`;
  return `https://eips.ethereum.org/EIPS/eip-${n}`;
}

async function fetchEntity(kind: Kind, number: number): Promise<Entity | null> {
  const repoSuffix = `${kind}s`; // eip→eips, erc→ercs, rip→rips
  const rows = await query<{
    eip_number: number;
    title: string;
    author: string | null;
    created_at: string | null;
    status: string | null;
    type: string | null;
    category: string | null;
    deadline: string | null;
    requires: number[] | null;
    updated_at: string | null;
    repo: string;
    file_path: string | null;
  }>(
    `
    SELECT e.eip_number, e.title, e.author, e.created_at,
           s.status, s.type, s.category, s.deadline, s.requires, s.updated_at,
           r.name AS repo,
           (SELECT f.file_path FROM eip_files f
             WHERE f.eip_id = e.id AND f.repository_id = r.id AND f.valid_to_sha IS NULL
             ORDER BY f.id DESC LIMIT 1) AS file_path
    FROM eips e
    JOIN eip_snapshots s ON s.eip_id = e.id
    JOIN repositories r ON r.id = s.repository_id
    WHERE e.eip_number = $1 AND lower(split_part(r.name, '/', 2)) = $2
    LIMIT 1
    `,
    [number, repoSuffix],
  );
  const row = rows[0];
  // RIPs are not in the shared `eips` table; they have their own.
  if (!row) return kind === "rip" ? fetchRip(number) : null;

  // Everything below depends only on the row above, so it all runs at once.
  // (Each query is a network round trip; in sequence they dominated the page's load time.)
  const [events, requiredBy, upgrades, prs, mtgRows, layerRows, src] = await Promise.all([
    query<StatusEvent>(
      `
      SELECT se.from_status, se.to_status, se.pr_number, se.changed_at
      FROM eip_status_events se
      JOIN eips e ON e.id = se.eip_id
      JOIN repositories r ON r.id = se.repository_id
      WHERE e.eip_number = $1 AND lower(split_part(r.name, '/', 2)) = $2
      ORDER BY se.changed_at ASC
      `,
      [number, repoSuffix],
    ),
    query<Ref>(
      `SELECT DISTINCT ON (e.id) e.eip_number AS number, e.title,
         CASE lower(split_part(r.name, '/', 2))
           WHEN 'ercs' THEN 'erc' WHEN 'rips' THEN 'rip' ELSE 'eip' END AS kind
       FROM eip_snapshots s
       JOIN eips e ON e.id = s.eip_id
       JOIN repositories r ON r.id = s.repository_id
       WHERE s.requires @> ARRAY[$1]::int[]
       ORDER BY e.id DESC
       LIMIT 24`,
      [number],
    ),
    query<UpgradeRef>(
      `SELECT u.slug, u.name, c.bucket
       FROM upgrade_composition_current c
       JOIN upgrades u ON u.id = c.upgrade_id
       WHERE c.eip_number = $1
       ORDER BY u.created_at DESC`,
      [number],
    ),
    query<{ pr_number: number; title: string; state: string; merged_at: string | null; author: string | null; updated_at: string; repo: string }>(
      `SELECT pr.pr_number, pr.title, pr.state, pr.merged_at, pr.author, pr.updated_at, r.name AS repo
       FROM pull_request_eips pe
       JOIN pull_requests pr ON pr.pr_number = pe.pr_number AND pr.repository_id = pe.repository_id
       JOIN repositories r ON r.id = pr.repository_id
       WHERE pe.eip_number = $1
       ORDER BY pr.updated_at DESC
       LIMIT 60`,
      [number],
    ),
    query<{ title: string; occurs_on: string | null; issue_url: string; source_url: string | null; snippet: string | null; mentioned_by: string | null }>(
      `SELECT DISTINCT ON (pa.issue_number)
         pa.issue_title AS title, pa.occurs_on, pa.issue_url, pa.source_url, pa.snippet, pa.mentioned_by
       FROM pm_agenda_eips pa
       WHERE pa.eip_number = $1 AND pa.issue_url IS NOT NULL
       ORDER BY pa.issue_number, pa.occurs_on DESC NULLS LAST`,
      [number],
    ),
    query<{ layer: string | null }>(`SELECT layer FROM eip_curations WHERE eip_number = $1 AND layer IS NOT NULL LIMIT 1`, [number]),
    fetchSource(row.repo, row.file_path),
  ]);

  const editsRe = new RegExp(`\\b(?:eip|erc|rip)[-\\s]?${number}\\b`, "i");
  const editorialPRs: EditorialPR[] = prs.map((r) => ({
    pr_number: r.pr_number,
    repo: r.repo,
    title: r.title,
    state: r.state,
    merged: r.merged_at != null,
    author: r.author,
    updated_at: String(r.updated_at),
    edits: editsRe.test(r.title ?? ""),
  }));

  const meetings: Meeting[] = mtgRows
    .map((r) => ({
      title: r.title,
      date: r.occurs_on ? String(r.occurs_on) : null,
      url: r.source_url || r.issue_url,
      snippet: r.snippet,
      mentionedBy: r.mentioned_by,
    }))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, 6);

  const layerCode = layerRows[0]?.layer ?? null;
  const layer = layerCode === "EL" ? "Execution Layer" : layerCode === "CL" ? "Consensus Layer" : layerCode;


  return {
    kind,
    number: row.eip_number,
    title: row.title,
    description: src.description,
    abstract: src.abstract,
    content: src.content,
    headings: src.headings,
    requiredBy,
    upgrades,
    authors: parseAuthors(row.author),
    created_at: row.created_at ? String(row.created_at) : null,
    status: row.status,
    type: row.type,
    category: row.category,
    layer,
    deadline: row.deadline ? String(row.deadline) : null,
    requires: (row.requires ?? []).map(Number).filter((n) => !Number.isNaN(n)),
    updated_at: row.updated_at ? String(row.updated_at) : null,
    repo: row.repo,
    githubUrl: row.file_path ? `https://github.com/${row.repo}/blob/master/${row.file_path}` : null,
    officialUrl: officialUrl(kind, number),
    events: events.map((e) => ({ ...e, changed_at: String(e.changed_at) })),
    editorialPRs,
    meetings,
  };
}

/** A Rollup Improvement Proposal. The scheduler tracks these in `rips` with less detail than
 *  EIPs: no status history, type, or dependency data, so those sections stay empty. */
async function fetchRip(number: number): Promise<Entity | null> {
  const rows = await query<{ id: number; rip_number: number; title: string | null; status: string | null; author: string | null; created_at: string | null }>(
    `SELECT id, rip_number, title, status, author, created_at FROM rips WHERE rip_number = $1 LIMIT 1`,
    [number],
  );
  const row = rows[0];
  // The table carries placeholder rows with no title (rip_number 0); those are not proposals.
  if (!row || !row.title?.trim()) return null;

  let updated: string | null = null;
  try {
    const last = await query<{ d: string | null }>(`SELECT max(commit_date) AS d FROM rip_commits WHERE rip_id = $1`, [row.id]);
    updated = last[0]?.d ? String(last[0].d) : null;
  } catch {
    // commit history is optional
  }

  const repo = "ethereum/RIPs";
  const filePath = `RIPS/rip-${number}.md`;
  const src = await fetchSource(repo, filePath);

  return {
    kind: "rip",
    number: row.rip_number,
    title: row.title?.trim() || "Untitled",
    description: src.description,
    abstract: src.abstract,
    content: src.content,
    headings: src.headings,
    requiredBy: [],
    upgrades: [],
    authors: parseAuthors(row.author),
    created_at: row.created_at ? String(row.created_at) : null,
    status: row.status,
    type: null,
    category: "RIP",
    layer: null,
    deadline: null,
    requires: [],
    updated_at: updated,
    repo,
    githubUrl: src.content ? `https://github.com/${repo}/blob/master/${filePath}` : null,
    officialUrl: officialUrl("rip", number),
    events: [],
    editorialPRs: [],
    meetings: [],
  };
}

export function getEntity(kind: Kind, number: number) {
  return fetchEntity(kind, number);
}

/** Which prefix a number is actually filed under, or null if it is not a proposal at all.
 *  One cheap query, used to redirect /erc/20 to /eip/20 and /eip/8179 to /erc/8179. */
export async function findKind(number: number): Promise<Kind | null> {
  const rows = await query<{ kind: Kind }>(
    `SELECT CASE lower(split_part(r.name, '/', 2)) WHEN 'ercs' THEN 'erc' WHEN 'rips' THEN 'rip' ELSE 'eip' END AS kind
     FROM eips e
     JOIN eip_snapshots s ON s.eip_id = e.id
     JOIN repositories r ON r.id = s.repository_id
     WHERE e.eip_number = $1
     LIMIT 1`,
    [number],
  );
  if (rows[0]) return rows[0].kind;
  try {
    const rip = await query(`SELECT 1 FROM rips WHERE rip_number = $1 AND title IS NOT NULL AND title <> '' LIMIT 1`, [number]);
    return rip.length ? "rip" : null;
  } catch {
    return null;
  }
}
