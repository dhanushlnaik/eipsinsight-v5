import { query } from "@/lib/db";
import { cachedOr } from "@/lib/cache";

export type WaitingOn = "editor" | "author" | "draft";

export interface QueueItem {
  repoShort: string;
  repo: string;
  number: number;
  title: string;
  author: string | null;
  waitingOn: WaitingOn;
  /** When it entered this state. Falls back to the PR's last update, then its creation. */
  since: string | null;
  opened: string | null;
  comments: number;
  labels: string[];
  reason: string | null;
  /** Required CI checks are red. The scheduler already moves these from "editor" to "author". */
  ciFailing: boolean;
  failingChecks: string[];
}

const STATE: Record<string, WaitingOn> = {
  WAITING_ON_EDITOR: "editor",
  WAITING_ON_AUTHOR: "author",
  DRAFT: "draft",
};

/**
 * The editorial queue: every open pull request, by who it is waiting on,
 * longest wait first. Read-only, from the scheduler's governance state.
 */
export const getQueue = cachedOr<QueueItem[]>(
  async () => {
    type Row = {
      pr_number: number; repo: string; title: string | null; author: string | null; current_state: string;
      waiting_since: string | null; created_at: string | null; updated_at: string | null;
      num_comments: number | null; labels: string[] | null; reason: string | null;
      ci_failing: boolean | null; failing_checks: string[] | null;
    };
    const sql = (ci: boolean) => `
      SELECT g.pr_number, r.name AS repo, pr.title, pr.author, g.current_state, g.waiting_since,
             pr.created_at, pr.updated_at, pr.num_comments, pr.labels, g.reason,
             ${ci ? "g.has_failing_required_checks AS ci_failing, g.failing_checks" : "NULL::boolean AS ci_failing, NULL::text[] AS failing_checks"}
      FROM pr_governance_state g
      JOIN pull_requests pr ON pr.pr_number = g.pr_number AND pr.repository_id = g.repository_id
      JOIN repositories r ON r.id = g.repository_id
      WHERE lower(pr.state) = 'open'
        AND pr.merged_at IS NULL
        AND g.current_state IN ('WAITING_ON_EDITOR', 'WAITING_ON_AUTHOR', 'DRAFT')
      ORDER BY coalesce(g.waiting_since, pr.updated_at, pr.created_at) ASC NULLS LAST
      LIMIT 1500`;
    // The CI columns come from a scheduler migration. Without them the queue still works, unflagged.
    let rows: Row[];
    try {
      rows = await query<Row>(sql(true));
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "42703") rows = await query<Row>(sql(false));
      else throw err;
    }
    return rows.map((r) => {
      const since = r.waiting_since ?? r.updated_at ?? r.created_at;
      return {
        repoShort: (r.repo.split("/").pop() ?? "eips").toLowerCase(),
        repo: r.repo,
        number: r.pr_number,
        title: r.title?.trim() || `Pull request #${r.pr_number}`,
        author: r.author,
        waitingOn: STATE[r.current_state] ?? "editor",
        since: since ? String(since) : null,
        opened: r.created_at ? String(r.created_at) : null,
        comments: r.num_comments ?? 0,
        labels: r.labels ?? [],
        reason: r.reason,
        ciFailing: Boolean(r.ci_failing),
        failingChecks: r.failing_checks ?? [],
      };
    });
  },
  ["v5-queue"],
  [],
);
