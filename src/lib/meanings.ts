import { tokenize } from "@/lib/utils";

export const STATUS_MEANING: Record<string, string> = {
  draft: "Open for community feedback and still being iterated on.",
  review: "Under formal review by editors and the community.",
  "last call": "Final review window before it can be accepted.",
  final: "Accepted and complete, no further changes are expected.",
  living: "Continually updated and never meant to be finalized.",
  stagnant: "Inactive for 6+ months; may be abandoned.",
  withdrawn: "Withdrawn by its authors; no longer being pursued.",
  moved: "Relocated to another repository or superseded.",
};

const TYPE_MEANING: Record<string, string> = {
  "standards track": "A change affecting most or all Ethereum implementations.",
  meta: "Describes a process or a change to how Ethereum is governed.",
  informational: "Provides guidelines or information; non-binding.",
};

const LAYER_MEANING: Record<string, string> = {
  "execution layer": "Lives on the execution layer: the EVM, transactions and state.",
  "consensus layer": "Lives on the consensus layer: proof-of-stake and the beacon chain.",
};

const CATEGORY_MEANING: Record<string, string> = {
  core: "Consensus-layer change that requires a network upgrade.",
  networking: "Changes to the devp2p / network protocol.",
  interface: "Client API, RPC, and language-level standards.",
  erc: "Application-level standard or convention.",
  rip: "Rollup-focused improvement proposal.",
};

const ROLE_MEANING: Record<string, string> = {
  editor: "Reviews and merges proposals; a maintainer of the EIP repository.",
  author: "Wrote or co-wrote this proposal.",
  reviewer: "Reviewed proposals or pull requests.",
  contributor: "Commented on or contributed to proposal discussions.",
};

const BUCKET_MEANING: Record<string, string> = {
  included: "Shipped in this network upgrade.",
  "scheduled for inclusion": "Committed to this upgrade, pending final spec.",
  scheduled: "Committed to this upgrade, pending final spec.",
  "considered for inclusion": "Being evaluated for this upgrade.",
  considered: "Being evaluated for this upgrade.",
  "proposed for inclusion": "Put forward for this upgrade.",
  proposed: "Put forward for this upgrade.",
  "declined for inclusion": "Not included in this upgrade.",
  declined: "Not included in this upgrade.",
};

const THREAD_MEANING: Record<string, string> = {
  open: "Still under discussion; not merged or closed yet.",
  merged: "Accepted and merged into the repository.",
  closed: "Closed without being merged.",
  approved: "This reviewer approved the change.",
  "changes requested": "This reviewer asked for changes before it can merge.",
  commented: "This reviewer left comments without approving or blocking.",
  dismissed: "This review was dismissed and no longer counts.",
};

// One lookup across all vocabularies. Keyed by lowercased value.
const ALL: Record<string, string> = {
  ...STATUS_MEANING,
  ...TYPE_MEANING,
  ...LAYER_MEANING,
  ...CATEGORY_MEANING,
  ...ROLE_MEANING,
  ...BUCKET_MEANING,
  ...THREAD_MEANING,
};

/** The plain-English meaning for a status / type / category / role / bucket value, if known. */
export function meaningFor(value: string): string | undefined {
  const key = value.trim().toLowerCase();
  return ALL[key] ?? ALL[tokenize(value).replace(/-/g, " ")];
}
