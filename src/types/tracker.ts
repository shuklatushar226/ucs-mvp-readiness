export interface TrackerPr {
  number: number;
  title: string;
  url: string;
  branch: string | null;
  /** Parsed from a feat/grace-<name>-<run6> branch or a [Bracketed] title. */
  connector: string | null;
  draft: boolean;
  author: string | null;
  updatedAt: string | null;
  mergedAt: string | null;
}

export interface TrackerLedgerRow {
  connector: string;
  status: "queued" | "running";
  startedAt: string | null;
  retries: number;
  error: string | null;
}

export interface TrackerData {
  generatedAt: string;
  repo: string;
  weekStart: string;
  weekEnd: string;
  /** null when the run ledger was not on the machine that built this file —
   *  which is the normal case in CI. Not the same as "nothing in progress". */
  ledger: { runId: string | null; updatedAt: string | null; rows: TrackerLedgerRow[] } | null;
  /** false when a GitHub query failed — the PR columns are then not trustworthy. */
  prsOk: boolean;
  warnings: string[];
  inReview: TrackerPr[];
  merged: TrackerPr[];
}
