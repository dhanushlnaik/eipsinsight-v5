# EIPsInsight v5: the Ethereum standards observatory

A search-first rebuild of EIPsInsight. Find anything (EIPs, ERCs, RIPs, pull requests,
issues, people, network upgrades) in one place, on a laptop or a phone.

## Architecture (strangler-fig)

v5 runs alongside v4 on the same Postgres and gradually replaces it.

```
        SHARED POSTGRES  (owned by the scheduler, the single source of truth)
        ├─ scheduler-owned tables (eip_*, rips, pull_requests, issues, contributor_*, upgrades…)
        │     v5 reads these SELECT-only. It never writes to them and never migrates them.
        └─ search_entities   the ONE table v5 owns (the unified search index)

   v4 app (unchanged) ──┐                  ┌── v5 app (this repo)
                        └── same DB ───────┘
```

Every surface reads through a small set of server functions in `src/server/`:

| Function | File | What it returns |
| --- | --- | --- |
| `search(q, { types })` | `search.ts` | Ranked, grouped hits from `search_entities` |
| `getEntity(kind, number)` | `entity.ts` | One EIP, ERC or RIP with lifecycle, dependencies, governance, spec |
| `getThread(kind, repo, number)` | `thread.ts` | One pull request or issue with linked proposals and reviews |
| `getContributor(actor)` | `contributor.ts` | One person: scores, roles, authored proposals, activity |
| `getUpgrade(slug)` | `upgrade.ts` | One network upgrade and its composition |
| `getQueue()` | `queue.ts` | Open pull requests with their editorial state, longest wait first |
| `getAllProposals()` and friends | `proposals.ts`, `stats.ts` | Lists and counters for the index pages |

Reads are cached for five minutes through `cachedOr` (`src/lib/cache.ts`), which never
caches a failure: if the database is unreachable a page shows its empty state for that
request and recovers on the next one.

## Stack

Bun, Next.js 16 (App Router, React 19), Tailwind v4, raw `pg` (read-only), TypeScript.
The design system is documented in [DESIGN.md](DESIGN.md).

## Run

```bash
bun install
bun run dev          # http://localhost:3005
```

`DATABASE_URL` is read from `.env`.

## The search index

Search, the command palette and the hero bar all read one table, `search_entities`.

### Build it (once)

```bash
bun run db:init          # creates search_entities + pg_trgm + indexes. CREATE only.
bun run search:refresh   # fills it from the scheduler tables
```

### What is indexed

| Type | Source | Address |
| --- | --- | --- |
| `eip`, `erc` | `eips` + `eip_snapshots` | `/eip/4844`, `/erc/20` |
| `rip` | `rips` | `/rip/7212` |
| `contributor` | `contributor_scores` | `/user/vbuterin` |
| `upgrade` | `upgrades` | `/upgrade/pectra` |
| `pr` | `pull_requests` | `/pr/eips/9145` |
| `issue` | `issues` | `/issue/eips/5000` |

Pull request and issue numbers repeat across repositories, so their ids and URLs carry
the repository (`eips`, `ercs`, `rips`).

### Keep it fresh

`search:refresh` is an upsert that only writes rows whose visible fields changed, so a
second run on an unchanged database writes nothing. Pick one way to schedule it:

**In the app (recommended).** Set this in the production environment and restart:

```bash
SEARCH_REFRESH_MINUTES=10
```

The server then refreshes the index itself on that interval (`src/instrumentation.ts`),
starting 20 seconds after boot, and logs `[search] index refreshed in …ms`. It is off
when the variable is unset, so local dev servers never write to the shared database.

**Or with cron on the server**, if you would rather keep writes out of the app process:

```bash
*/10 * * * * cd /path/to/eipsinsight-v5 && bun run search:refresh >> /var/log/eipsinsight-search.log 2>&1
```

### How search ranks

Strongest signal first: the query is this record's number, the title is exactly the
query, the title starts with it, the title contains it, then full-text rank and trigram
similarity (which is what forgives typos). Results come back grouped (proposals,
upgrades, people, pull requests, issues) with a short preview of each group and the full
count, so a busy group cannot crowd out the others. A group holding an exact hit leads:
searching a GitHub handle shows the person before the proposals that mention them.

A bare number, or `EIP-123` / `ERC-20`, never waits for the database. The client jumps
straight to that proposal (`src/lib/swoop.ts`).

## Routes

| Route | Page |
| --- | --- |
| `/` | Front page: search, figures, the index mosaic, latest movements |
| `/search?q=&type=` | Full search, scope in the URL |
| `/proposals?kind=&track=&status=` | Browse every proposal |
| `/eip/[n]`, `/erc/[n]`, `/rip/[n]` | A proposal |
| `/pr/[repo]/[n]`, `/issue/[repo]/[n]` | A pull request or an issue |
| `/upgrades`, `/upgrade/[slug]` | Network upgrades |
| `/people`, `/user/[actor]` | Contributors |
| `/queue?waiting=&repo=` | Editorial queue: open pull requests by who they are waiting on |
